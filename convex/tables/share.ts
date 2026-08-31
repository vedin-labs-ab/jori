import { paginationOptsValidator } from "convex/server"
import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import {
  internalMutation,
  type MutationCtx,
  mutation,
  query,
} from "../_generated/server"
import { pageDocuments } from "../collections/documents"
import {
  type MintedShare,
  mintShare,
  openMaterialRead,
  pageShares,
  revokeShare,
  type ShareTarget,
} from "../collections/shares"
import { ensureCurrentPerson, resolveCurrentPerson } from "../persons/account"
import { type QueryLikeCtx } from "../shared/context"
import { getAccessibleTable, summarizeRow } from "./access"

export const mint = internalMutation({
  args: {
    organizationId: v.string(),
    tableId: v.id("collections"),
    personId: v.id("persons"),
    expiresInHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => await mintTableShare(ctx, args),
})

export const create = mutation({
  args: {
    organizationId: v.string(),
    tableId: v.id("collections"),
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
    tableId: v.id("collections"),
    shareId: v.id("shares"),
  },
  handler: async (ctx, args): Promise<null> => {
    const personId = await ensureCurrentPerson(ctx, args.organizationId)

    await revokeTableShare(ctx, { ...args, personId })

    return null
  },
})

export const page = query({
  args: {
    organizationId: v.string(),
    tableId: v.id("collections"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const personId = await resolveCurrentPerson(ctx, args.organizationId)
    const table = await getAccessibleTable(ctx, { ...args, personId })

    return await pageShares(ctx, tableTarget(table._id), args.paginationOpts)
  },
})

/** Anonymous read: a share secret or the table's own public visibility is
 *  the whole credential. Returns null on every failure so callers cannot
 *  probe which tables exist. */
export const get = query({
  args: { tableId: v.string(), secret: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const opened = await openTableShare(ctx, args)

    if (opened === null) {
      return null
    }

    return {
      name: opened.table.name,
      description: opened.table.description,
      columns: opened.table.columns,
      access: opened.read.access,
      expiresAt:
        opened.read.access === "share" ? opened.read.expiresAt : undefined,
    }
  },
})

/** Row pages behind the same gate as `get`; an invalid link reads as an
 *  empty, finished table rather than an error. */
export const rows = query({
  args: {
    tableId: v.string(),
    secret: v.optional(v.string()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const opened = await openTableShare(ctx, args)

    if (opened === null) {
      return { page: [], isDone: true, continueCursor: "" }
    }

    const result = await pageDocuments(
      ctx,
      opened.table._id,
      args.paginationOpts
    )

    return { ...result, page: result.page.map((row) => summarizeRow(row)) }
  },
})

export async function mintTableShare(
  ctx: MutationCtx,
  args: {
    organizationId: string
    tableId: Id<"collections">
    personId: Id<"persons">
    expiresInHours?: number
  }
): Promise<MintedShare> {
  const table = await getAccessibleTable(ctx, args)

  if (table.archivedAt !== undefined) {
    throw new Error("Restore the table before sharing it.")
  }

  return await mintShare(ctx, {
    target: tableTarget(table._id),
    organizationId: table.organizationId,
    personId: args.personId,
    urlPath: `/tables/${table._id}`,
    expiresInHours: args.expiresInHours,
  })
}

export async function revokeTableShare(
  ctx: MutationCtx,
  args: {
    organizationId: string
    tableId: Id<"collections">
    shareId: Id<"shares">
    personId: Id<"persons">
  }
) {
  const table = await getAccessibleTable(ctx, args)

  await revokeShare(ctx, {
    target: tableTarget(table._id),
    organizationId: table.organizationId,
    shareId: args.shareId,
  })
}

/** Resolve an anonymous read to its table: a share link's secret, expiry,
 *  organization, archive state, and the creator's continued access all
 *  checked on every read — or the table's own public visibility. */
export async function openTableShare(
  ctx: QueryLikeCtx,
  args: { tableId: string; secret?: string }
) {
  const tableId = ctx.db.normalizeId("collections", args.tableId)
  const table = tableId === null ? null : await ctx.db.get(tableId)

  if (table === null || table.kind !== "table") {
    return null
  }

  const read = await openMaterialRead(ctx, {
    target: tableTarget(table._id),
    material: table,
    secret: args.secret,
  })

  return read === null ? null : { table, read }
}

function tableTarget(tableId: Id<"collections">): ShareTarget {
  return { kind: "table", id: tableId }
}
