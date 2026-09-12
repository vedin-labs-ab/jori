import { v } from "convex/values"
import { type Doc, type TableNames } from "../_generated/dataModel"
import { internalQuery, type QueryCtx } from "../_generated/server"

export const tables = [
  "webhookDeliveries",
  "integrationOffers",
  "emailSubmissions",
  "documents",
  "sessions",
  "drafts",
  "shares",
  "transitions",
  "approvals",
  "waiters",
  "traces",
  "transcript",
  "messages",
  "events",
  "backfills",
  "subscriptions",
  "organizationSources",
  "organizationDiscovery",
  "organizationProfile",
  "evidence",
  "journal",
  "beliefs",
  "efforts",
  "passes",
  "reactions",
  "identities",
  "permissions",
  "skills",
  "files",
  "collections",
  "folders",
  "persons",
  "places",
  "jobs",
  "integrations",
  "runs",
  "conversations",
] as const satisfies readonly TableNames[]

export const inventory = internalQuery({ args: {}, handler: () => tables })

export const page = internalQuery({
  args: {
    organizationId: v.string(),
    table: v.union(...tables.map((table) => v.literal(table))),
    cursor: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const result = await ctx.db.query(args.table).paginate({
      cursor: args.cursor,
      numItems: 20,
      maximumBytesRead: 2_000_000,
    })
    const page: unknown[] = []
    for (const row of result.page) {
      if (await belongs(ctx, row, args.organizationId)) {
        page.push(sanitize(args.table, row))
      }
    }
    return { ...result, page }
  },
})

async function belongs(
  ctx: QueryCtx,
  row: Doc<TableNames>,
  organizationId: string
) {
  if ("organizationId" in row) {
    return row.organizationId === organizationId
  }
  if ("collectionId" in row) {
    return (
      (await ctx.db.get(row.collectionId))?.organizationId === organizationId
    )
  }
  if ("conversationId" in row && row.conversationId) {
    return (
      (await ctx.db.get(row.conversationId))?.organizationId === organizationId
    )
  }
  if ("runId" in row && row.runId) {
    return (await ctx.db.get(row.runId))?.organizationId === organizationId
  }
  return false
}

// Credentials are not customer-return data. Provider-specific integration data
// can also hold installation tokens, so only its display fields are exported.
export function sanitize(table: string, row: Record<string, unknown>) {
  if (table === "integrations") {
    const {
      _id,
      organizationId,
      integration,
      scope,
      ownerId,
      externalId,
      name,
      email,
      status,
      createdAt,
      updatedAt,
    } = row
    return {
      _id,
      organizationId,
      integration,
      scope,
      ownerId,
      externalId,
      name,
      email,
      status,
      createdAt,
      updatedAt,
    }
  }
  return redact(row)
}

const sensitive =
  /^(credentials|secret|secrets|password|accessToken|refreshToken|token|tokenHash|authorization|cookie|cookies|apiKey|clientSecret|storageId)$/i
function redact(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redact)
  }
  if (value === null || typeof value !== "object") {
    return value
  }
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !sensitive.test(key))
      .map(([key, item]) => [key, redact(item)])
  )
}
