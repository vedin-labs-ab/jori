import { isRecord } from "../../contracts/json"
import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { normalizeExpectedVersion } from "../collections/input"
import {
  boundedNumber,
  type JoriToolRequest,
  optionalNumber,
  optionalString,
  readRecord,
  requiredString,
  requiredStringArray,
} from "../shared/input"
import { visibilityFromInput } from "../visibility/schema"

const storeTools = new Set([
  "search_stores",
  "create_store",
  "read_store",
  "write_store",
  "share_store",
])

export function isJoriStoreTool(tool: string) {
  return storeTools.has(tool)
}

export async function callJoriStoreTool(
  ctx: ActionCtx,
  execution: { organizationId: string; createdBy?: Id<"persons"> },
  request: JoriToolRequest
): Promise<unknown> {
  const args = readRecord(request.args)
  const personId = execution.createdBy

  if (personId === undefined) {
    throw new Error("Store tools require an authenticated execution user.")
  }

  const organizationId = execution.organizationId

  switch (request.tool) {
    case "search_stores":
      return await ctx.runQuery(internal.stores.queries.search, {
        organizationId,
        personId,
        query: optionalString(args.query),
        includeArchived: args.includeArchived === true,
        limit: boundedNumber(args.limit, 25, 1, 100),
      })
    case "create_store":
      return await ctx.runMutation(internal.stores.records.create, {
        organizationId,
        personId,
        name: requiredString(args.name, "name"),
        description: optionalString(args.description),
        visibility: visibilityFromInput(args.visibility),
        schema: args.schema,
      })
    case "read_store":
      return await ctx.runQuery(internal.stores.values.read, {
        organizationId,
        personId,
        storeId: requiredStoreId(args.storeId),
      })
    case "write_store":
      return await ctx.runMutation(internal.stores.values.write, {
        organizationId,
        personId,
        storeId: requiredStoreId(args.storeId),
        expectedVersion: normalizeExpectedVersion(args.expectedVersion),
        write: normalizeStoreWriteInput(args),
      })
    case "share_store":
      return await ctx.runMutation(internal.stores.share.mint, {
        organizationId,
        personId,
        storeId: requiredStoreId(args.storeId),
        expiresInHours: optionalNumber(args.expiresInHours),
      })
    default:
      throw new Error(`Unknown Jori store tool: ${request.tool}`)
  }
}

export function normalizeStoreWriteInput(args: Record<string, unknown>) {
  if ("claim" in args) {
    return normalizeClaim(args.claim)
  }

  if ("patch" in args) {
    return { type: "merge" as const, patch: args.patch }
  }

  if ("value" in args) {
    return { type: "replace" as const, value: args.value }
  }

  throw new Error("A store write requires value, patch, or claim.")
}

function normalizeClaim(claim: unknown) {
  if (!isRecord(claim)) {
    throw new Error("claim must be an object with path and value.")
  }

  return {
    type: "claim" as const,
    path: requiredStringArray(claim.path, "claim.path"),
    value: claim.value,
  }
}

function requiredStoreId(value: unknown) {
  return requiredString(value, "storeId") as Id<"collections">
}
