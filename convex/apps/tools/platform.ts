"use node"

import { internal } from "../../_generated/api"
import { type Id } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"
import { requiredString } from "../../shared/input"
import { type AppSessionGrant } from "../schema"
import {
  normalizeExpectedVersion,
  normalizeListLimit,
  normalizeStateWrite,
} from "./input"
import { promptModel, readAppModel } from "./prompt"

export type AppPlatformContext = {
  organizationId: string
  appId: Id<"apps">
  versionId: Id<"appVersions">
  personId: Id<"persons">
  grant: AppSessionGrant
}

type AppPlatformRequest = {
  tool: string
  args: Record<string, unknown>
}

type AppDataContext = {
  organizationId: string
  appId: Id<"apps">
  personId: Id<"persons">
}

const platformTools = new Set([
  "readState",
  "listState",
  "updateState",
  "promptModel",
])

/** All a share-grant session may call: read published, shared-scope data. */
const shareGrantTools = new Set(["readState", "listState"])

export function isAppPlatformTool(tool: string) {
  return platformTools.has(tool)
}

export function isShareGrantTool(tool: string) {
  return shareGrantTools.has(tool)
}

export function createAppPlatformToolCacheArgs(
  tool: string,
  args: Record<string, unknown>
) {
  if (tool !== "promptModel") {
    return args
  }

  return {
    ...args,
    _miloCache: {
      model: readAppModel(),
    },
  }
}

export async function callAppPlatformTool(
  ctx: ActionCtx,
  context: AppPlatformContext,
  request: AppPlatformRequest
) {
  switch (request.tool) {
    case "readState":
      return await readState(ctx, context, request.args)
    case "listState":
      return await listState(ctx, context, request.args)
    case "updateState":
      return await updateState(ctx, context, request.args)
    case "promptModel":
      return await promptModel(context, request.args)
    default:
      throw new Error(`Unknown app platform tool: ${request.tool}`)
  }
}

async function readState(
  ctx: ActionCtx,
  context: AppPlatformContext,
  args: Record<string, unknown>
) {
  return await ctx.runQuery(internal.apps.state.read, {
    ...appDataContext(context),
    grant: context.grant,
    contractName: requiredString(args.contractName, "contractName"),
  })
}

async function listState(
  ctx: ActionCtx,
  context: AppPlatformContext,
  args: Record<string, unknown>
) {
  return await ctx.runQuery(internal.apps.state.list, {
    ...appDataContext(context),
    grant: context.grant,
    limit: normalizeListLimit(args.limit),
  })
}

async function updateState(
  ctx: ActionCtx,
  context: AppPlatformContext,
  args: Record<string, unknown>
) {
  return await ctx.runMutation(internal.apps.state.update, {
    ...appDataContext(context),
    contractName: requiredString(args.contractName, "contractName"),
    expectedVersion: normalizeExpectedVersion(args.expectedVersion),
    write: normalizeStateWrite(args),
  })
}

function appDataContext(context: AppPlatformContext): AppDataContext {
  return {
    organizationId: context.organizationId,
    appId: context.appId,
    personId: context.personId,
  }
}
