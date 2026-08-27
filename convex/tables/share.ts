import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { shareExpiresAt } from "../../contracts/shares/expiry"
import { type TableColumn } from "../../contracts/tables/columns"
import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import {
  internalMutation,
  type MutationCtx,
  mutation,
  query,
} from "../_generated/server"
import { canAccessMaterial } from "../materials/access"
import {
  canOpenShare,
  type MintedShare,
  mintedShare,
  randomShareSecret,
  shareLink,
  sharesToRetire,
} from "../materials/shares"
import { ensureCurrentPerson, resolveCurrentPerson } from "../persons/account"
import { type QueryLikeCtx } from "../shared/context"
import { getAccessibleTable, summarizeRow } from "./access"

/** Create an independent share link; existing links keep their own expiry.
 *  A link is a read capability for this one table regardless of scope. */
export const mint = internalMutation({
  args: {
    organizationId: v.string(),
    tableId: v.id("tables"),
    personId: v.id("persons"),
    expiresInHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => await mintTableShare(ctx, args),
})

export const create = mutation({
  args: {
    organizationId: v.string(),
    tableId: v.id("tables"),
    expiresInHours: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<MintedShare> => {
    const personId = await ensureCurrentPerson(ctx, args.organizationId)

    return await ctx.runMutation(internal.tables.share.mint, {
      ...args,
      personId,
    })
  },
})

export const revoke = mutation({
  args: {
    organizationId: v.string(),
    tableId: v.id("tables"),
    shareId: v.id("tableShares"),
  },
  handler: async (ctx, args): Promise<null> => {
    const personId = await ensureCurrentPerson(ctx, args.organizationId)

    await revokeTableShare(ctx, { ...args, personId })

    return null
  },
})

/** Expiration order is also lifecycle order: every future expiry sorts ahead
 *  of every past expiry, so one indexed cursor yields active links first. */
export const page = query({
  args: {
    organizationId: v.string(),
    tableId: v.id("tables"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const personId = await resolveCurrentPerson(ctx, args.organizationId)

    await getAccessibleTable(ctx, { ...args, personId })

    const result = await ctx.db
      .query("tableShares")
      .withIndex("by_table_and_expires_at", (index) =>
        index.eq("tableId", args.tableId)
      )
      .order("desc")
      .paginate(args.paginationOpts)

    return {
      ...result,
      page: result.page.map((share) => ({
        shareId: share._id,
        createdAt: share.createdAt,
        expiresAt: share.expiresAt,
      })),
    }
  },
})

/** Anonymous share read: the secret is the whole credential. Returns null on
 *  every failure so callers cannot probe which tables exist. */
export const get = query({
  args: { tableId: v.string(), secret: v.string() },
  handler: async (ctx, args) => {
    const opened = await openTableShare(ctx, args)

    if (opened === null) {
      return null
    }

    return {
      name: opened.table.name,
      description: opened.table.description,
      columns: opened.table.columns as TableColumn[],
      expiresAt: opened.share.expiresAt,
    }
  },
})

/** Row pages behind the same gate as `get`; an invalid link reads as an
 *  empty, finished table rather than an error. */
export const rows = query({
  args: {
    tableId: v.string(),
    secret: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const opened = await openTableShare(ctx, args)

    if (opened === null) {
      return { page: [], isDone: true, continueCursor: "" }
    }

    const result = await ctx.db
      .query("tableRows")
      .withIndex("by_table", (index) => index.eq("tableId", opened.table._id))
      .order("desc")
      .paginate(args.paginationOpts)

    return { ...result, page: result.page.map((row) => summarizeRow(row)) }
  },
})

export async function mintTableShare(
  ctx: MutationCtx,
  args: {
    organizationId: string
    tableId: Id<"tables">
    personId: Id<"persons">
    expiresInHours?: number
  }
): Promise<MintedShare> {
  const table = await getAccessibleTable(ctx, args)

  if (table.archivedAt !== undefined) {
    throw new Error("Restore the table before sharing it.")
  }

  const now = Date.now()
  const secret = randomShareSecret()
  const expiresAt = shareExpiresAt(now, args.expiresInHours)
  const activeShares = await ctx.db
    .query("tableShares")
    .withIndex("by_table_and_expires_at", (index) =>
      index.eq("tableId", table._id).gt("expiresAt", now)
    )
    .collect()

  for (const stale of sharesToRetire(activeShares, now)) {
    await ctx.db.delete(stale._id)
  }

  await ctx.db.insert("tableShares", {
    organizationId: table.organizationId,
    tableId: table._id,
    createdBy: args.personId,
    secret,
    createdAt: now,
    expiresAt,
  })

  return mintedShare(shareLink(`/tables/${table._id}`, secret), expiresAt)
}

export async function revokeTableShare(
  ctx: MutationCtx,
  args: {
    organizationId: string
    tableId: Id<"tables">
    shareId: Id<"tableShares">
    personId: Id<"persons">
  }
) {
  const table = await getAccessibleTable(ctx, args)
  const share = await ctx.db.get(args.shareId)

  if (
    share === null ||
    share.tableId !== table._id ||
    share.organizationId !== table.organizationId
  ) {
    throw new Error("Share link not found.")
  }

  await ctx.db.delete(share._id)
}

/** Resolve a share link to its table: secret, expiry, organization, archive
 *  state, and the creator's continued access all checked on every read. */
export async function openTableShare(
  ctx: QueryLikeCtx,
  args: { tableId: string; secret: string }
) {
  const tableId = ctx.db.normalizeId("tables", args.tableId)
  const table = tableId === null ? null : await ctx.db.get(tableId)

  if (tableId === null || table === null) {
    return null
  }

  const share = await ctx.db
    .query("tableShares")
    .withIndex("by_table_and_secret", (index) =>
      index.eq("tableId", tableId).eq("secret", args.secret)
    )
    .unique()

  if (
    share === null ||
    !canOpenShare({
      share,
      material: table,
      creatorHasAccess: canAccessMaterial(table, share.createdBy),
      secret: args.secret,
      now: Date.now(),
    })
  ) {
    return null
  }

  return { table, share }
}
