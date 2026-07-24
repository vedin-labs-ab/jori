import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import {
  boundedNumber,
  type MiloToolRequest,
  optionalString,
  requiredString,
} from "../shared/input"
import {
  normalizeAccess,
  normalizeBuild,
  normalizeCapabilities,
  normalizeSource,
  normalizeToolArgs,
  requiredAppId,
} from "./tools/args"
import { normalizeExpectedVersion, normalizeStateWrite } from "./tools/input"

const appTools = new Set([
  "create_app",
  "read_app_state",
  "read_app",
  "search_apps",
  "share_app",
  "update_app_state",
  "update_app",
  "delete_app",
])

export function isMiloAppTool(tool: string) {
  return appTools.has(tool)
}

export async function callMiloAppTool(
  ctx: ActionCtx,
  execution: {
    organizationId: string
    createdBy?: Id<"persons">
    runId?: Id<"runs">
  },
  request: MiloToolRequest
): Promise<unknown> {
  const args = normalizeToolArgs(request.args)
  const personId = execution.createdBy

  if (personId === undefined) {
    throw new Error("App tools require an authenticated execution user.")
  }

  switch (request.tool) {
    case "create_app":
      return await createApp(ctx, execution.organizationId, personId, args)
    case "update_app":
      return await updateApp(ctx, execution.organizationId, personId, args)
    case "search_apps":
      return await searchApps(ctx, execution.organizationId, personId, args)
    case "read_app":
      return await readApp(ctx, execution.organizationId, personId, args)
    case "read_app_state":
      return await readAppState(ctx, execution, personId, args)
    case "update_app_state":
      return await updateAppState(ctx, execution, personId, args)
    case "share_app":
      return await shareApp(ctx, execution.organizationId, personId, args)
    case "delete_app":
      return await deleteApp(ctx, execution.organizationId, args)
    default:
      throw new Error(`Unknown Milo app tool: ${request.tool}`)
  }
}

async function createApp(
  ctx: ActionCtx,
  organizationId: string,
  personId: Id<"persons">,
  args: Record<string, unknown>
): Promise<unknown> {
  if (typeof args.template === "string") {
    return await ctx.runAction(internal.apps.actions.instantiateFromAgent, {
      organizationId,
      personId,
      template: args.template,
      title: optionalString(args.title),
      access:
        args.access === undefined ? undefined : normalizeAccess(args.access),
      message: optionalString(args.message),
    })
  }

  return await ctx.runAction(internal.apps.actions.createFromAgent, {
    organizationId,
    personId,
    title: requiredString(args.title, "title"),
    access: normalizeAccess(args.access),
    contract: args.contract,
    source: normalizeSource(args.source),
    build: normalizeBuild(args.build),
    message: optionalString(args.message),
    capabilities: normalizeCapabilities(args.capabilities),
  })
}

async function updateApp(
  ctx: ActionCtx,
  organizationId: string,
  personId: Id<"persons">,
  args: Record<string, unknown>
): Promise<unknown> {
  return await ctx.runAction(internal.apps.actions.updateFromAgent, {
    organizationId,
    personId,
    appId: requiredAppId(args.appId),
    title: requiredString(args.title, "title"),
    access: normalizeAccess(args.access),
    contract: args.contract,
    source: normalizeSource(args.source),
    build: normalizeBuild(args.build),
    message: optionalString(args.message),
    capabilities: normalizeCapabilities(args.capabilities),
  })
}

async function searchApps(
  ctx: ActionCtx,
  organizationId: string,
  personId: Id<"persons">,
  args: Record<string, unknown>
): Promise<unknown> {
  return await ctx.runQuery(internal.apps.queries.searchForAgent, {
    organizationId,
    personId,
    query: optionalString(args.query),
    includeArchived: args.includeArchived === true,
    limit: boundedNumber(args.limit, 25, 1, 100),
  })
}

async function readApp(
  ctx: ActionCtx,
  organizationId: string,
  personId: Id<"persons">,
  args: Record<string, unknown>
): Promise<unknown> {
  const appId = requiredAppId(args.appId)
  const metadata = (await ctx.runQuery(internal.apps.queries.readForAgent, {
    organizationId,
    personId,
    appId,
  })) as Record<string, unknown> | null

  if (metadata === null) {
    return null
  }

  const source = (await ctx.runAction(internal.apps.actions.readForAgent, {
    organizationId,
    appId,
    versionId: optionalString(args.versionId) as Id<"appVersions"> | undefined,
  })) as { files?: unknown[] } | null

  return { ...metadata, source: source?.files ?? [] }
}

async function readAppState(
  ctx: ActionCtx,
  execution: { organizationId: string; runId?: Id<"runs"> },
  personId: Id<"persons">,
  args: Record<string, unknown>
) {
  return await ctx.runQuery(internal.apps.state.read, {
    organizationId: execution.organizationId,
    personId,
    appId: await resolveAppId(
      ctx,
      execution.organizationId,
      args,
      execution.runId
    ),
    contractName: requiredString(args.contractName, "contractName"),
  })
}

async function updateAppState(
  ctx: ActionCtx,
  execution: { organizationId: string; runId?: Id<"runs"> },
  personId: Id<"persons">,
  args: Record<string, unknown>
) {
  return await ctx.runMutation(internal.apps.state.update, {
    organizationId: execution.organizationId,
    personId,
    appId: await resolveAppId(
      ctx,
      execution.organizationId,
      args,
      execution.runId
    ),
    contractName: requiredString(args.contractName, "contractName"),
    expectedVersion: normalizeExpectedVersion(args.expectedVersion),
    write: normalizeStateWrite(args),
  })
}

async function shareApp(
  ctx: ActionCtx,
  organizationId: string,
  personId: Id<"persons">,
  args: Record<string, unknown>
) {
  return await ctx.runMutation(internal.apps.serve.share.mint, {
    organizationId,
    personId,
    appId: requiredAppId(args.appId),
    expiresInHours:
      typeof args.expiresInHours === "number" ? args.expiresInHours : undefined,
  })
}

async function deleteApp(
  ctx: ActionCtx,
  organizationId: string,
  args: Record<string, unknown>
) {
  return await ctx.runMutation(internal.apps.records.remove, {
    organizationId,
    appId: requiredAppId(args.appId),
  })
}

async function resolveAppId(
  ctx: ActionCtx,
  organizationId: string,
  args: Record<string, unknown>,
  runId: Id<"runs"> | undefined
) {
  if (typeof args.appId === "string") {
    return requiredAppId(args.appId)
  }

  if (runId === undefined) {
    throw new Error("appId is required outside app-owned automation runs.")
  }

  const appId = await ctx.runQuery(internal.apps.queries.getAppIdForRun, {
    organizationId,
    runId,
  })

  if (appId === null) {
    throw new Error("No app is attached to this automation run.")
  }

  return appId
}
