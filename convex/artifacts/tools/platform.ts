"use node"

import { internal } from "../../_generated/api"
import { type Id } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"
import { requiredString } from "../../shared/input"
import { type ArtifactSessionGrant } from "../schema"
import {
  normalizeExpectedVersion,
  normalizeListLimit,
  normalizeStateWrite,
} from "./input"
import { promptModel, readArtifactModel } from "./prompt"

export type ArtifactPlatformContext = {
  tenantId: string
  artifactId: Id<"artifacts">
  versionId: Id<"artifactVersions">
  personId: Id<"persons">
  grant: ArtifactSessionGrant
}

type ArtifactPlatformRequest = {
  tool: string
  args: Record<string, unknown>
}

type ArtifactDataContext = {
  tenantId: string
  artifactId: Id<"artifacts">
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

export function isArtifactPlatformTool(tool: string) {
  return platformTools.has(tool)
}

export function isShareGrantTool(tool: string) {
  return shareGrantTools.has(tool)
}

export function createArtifactPlatformToolCacheArgs(
  tool: string,
  args: Record<string, unknown>
) {
  if (tool !== "promptModel") {
    return args
  }

  return {
    ...args,
    _miloCache: {
      model: readArtifactModel(),
    },
  }
}

export async function callArtifactPlatformTool(
  ctx: ActionCtx,
  context: ArtifactPlatformContext,
  request: ArtifactPlatformRequest
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
      throw new Error(`Unknown artifact platform tool: ${request.tool}`)
  }
}

async function readState(
  ctx: ActionCtx,
  context: ArtifactPlatformContext,
  args: Record<string, unknown>
) {
  return await ctx.runQuery(internal.artifacts.state.read, {
    ...artifactDataContext(context),
    grant: context.grant,
    contractName: requiredString(args.contractName, "contractName"),
  })
}

async function listState(
  ctx: ActionCtx,
  context: ArtifactPlatformContext,
  args: Record<string, unknown>
) {
  return await ctx.runQuery(internal.artifacts.state.list, {
    ...artifactDataContext(context),
    grant: context.grant,
    limit: normalizeListLimit(args.limit),
  })
}

async function updateState(
  ctx: ActionCtx,
  context: ArtifactPlatformContext,
  args: Record<string, unknown>
) {
  return await ctx.runMutation(internal.artifacts.state.update, {
    ...artifactDataContext(context),
    contractName: requiredString(args.contractName, "contractName"),
    expectedVersion: normalizeExpectedVersion(args.expectedVersion),
    write: normalizeStateWrite(args),
  })
}

function artifactDataContext(
  context: ArtifactPlatformContext
): ArtifactDataContext {
  return {
    tenantId: context.tenantId,
    artifactId: context.artifactId,
    personId: context.personId,
  }
}
