import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { boundedNumber, optionalString, requiredString } from "../shared/input"
import {
  normalizeAccess,
  normalizeBuild,
  normalizeCapabilities,
  normalizeSource,
  normalizeToolArgs,
  requiredArtifactId,
} from "./tools/args"
import { normalizeExpectedVersion, normalizeStateWrite } from "./tools/input"

type MiloArtifactRequest = {
  tool: string
  args?: unknown
}

const artifactTools = new Set([
  "create_artifact",
  "read_artifact_state",
  "read_artifact",
  "search_artifacts",
  "update_artifact_state",
  "update_artifact",
  "delete_artifact",
])

export function isMiloArtifactTool(tool: string) {
  return artifactTools.has(tool)
}

export async function callMiloArtifactTool(
  ctx: ActionCtx,
  execution: {
    tenantId: string
    createdBy?: string
    runId?: Id<"runs">
  },
  request: MiloArtifactRequest
) {
  const args = normalizeToolArgs(request.args)
  const userId = execution.createdBy

  if (userId === undefined) {
    throw new Error("Artifact tools require an authenticated execution user.")
  }

  switch (request.tool) {
    case "create_artifact":
      return await createArtifact(ctx, execution.tenantId, userId, args)
    case "update_artifact":
      return await updateArtifact(ctx, execution.tenantId, userId, args)
    case "search_artifacts":
      return await searchArtifacts(ctx, execution.tenantId, userId, args)
    case "read_artifact":
      return await readArtifact(ctx, execution.tenantId, userId, args)
    case "read_artifact_state":
      return await readArtifactState(ctx, execution, userId, args)
    case "update_artifact_state":
      return await updateArtifactState(ctx, execution, userId, args)
    case "delete_artifact":
      return await deleteArtifact(ctx, execution.tenantId, args)
    default:
      throw new Error(`Unknown Milo artifact tool: ${request.tool}`)
  }
}

async function createArtifact(
  ctx: ActionCtx,
  tenantId: string,
  userId: string,
  args: Record<string, unknown>
) {
  return await ctx.runAction(internal.artifacts.actions.createFromAgent, {
    tenantId,
    userId,
    title: requiredString(args.title, "title"),
    access: normalizeAccess(args.access),
    contract: args.contract,
    source: normalizeSource(args.source),
    build: normalizeBuild(args.build),
    message: optionalString(args.message),
    capabilities: normalizeCapabilities(args.capabilities),
  })
}

async function updateArtifact(
  ctx: ActionCtx,
  tenantId: string,
  userId: string,
  args: Record<string, unknown>
) {
  return await ctx.runAction(internal.artifacts.actions.updateFromAgent, {
    tenantId,
    userId,
    artifactId: requiredArtifactId(args.artifactId),
    title: requiredString(args.title, "title"),
    access: normalizeAccess(args.access),
    contract: args.contract,
    source: normalizeSource(args.source),
    build: normalizeBuild(args.build),
    message: optionalString(args.message),
    capabilities: normalizeCapabilities(args.capabilities),
  })
}

async function searchArtifacts(
  ctx: ActionCtx,
  tenantId: string,
  userId: string,
  args: Record<string, unknown>
) {
  return await ctx.runQuery(internal.artifacts.queries.searchForAgent, {
    tenantId,
    userId,
    query: optionalString(args.query),
    includeArchived: args.includeArchived === true,
    limit: boundedNumber(args.limit, 25, 1, 100),
  })
}

async function readArtifact(
  ctx: ActionCtx,
  tenantId: string,
  userId: string,
  args: Record<string, unknown>
) {
  const artifactId = requiredArtifactId(args.artifactId)
  const metadata = await ctx.runQuery(internal.artifacts.queries.readForAgent, {
    tenantId,
    userId,
    artifactId,
  })

  if (metadata === null) {
    return null
  }

  const source = await ctx.runAction(internal.artifacts.actions.readForAgent, {
    tenantId,
    artifactId,
    versionId: optionalString(args.versionId) as
      | Id<"artifactVersions">
      | undefined,
  })

  return { ...metadata, source: source?.files ?? [] }
}

async function readArtifactState(
  ctx: ActionCtx,
  execution: { tenantId: string; runId?: Id<"runs"> },
  userId: string,
  args: Record<string, unknown>
) {
  return await ctx.runQuery(internal.artifacts.state.read, {
    tenantId: execution.tenantId,
    userId,
    artifactId: await resolveArtifactId(
      ctx,
      execution.tenantId,
      args,
      execution.runId
    ),
    contractName: requiredString(args.contractName, "contractName"),
  })
}

async function updateArtifactState(
  ctx: ActionCtx,
  execution: { tenantId: string; runId?: Id<"runs"> },
  userId: string,
  args: Record<string, unknown>
) {
  return await ctx.runMutation(internal.artifacts.state.update, {
    tenantId: execution.tenantId,
    userId,
    artifactId: await resolveArtifactId(
      ctx,
      execution.tenantId,
      args,
      execution.runId
    ),
    contractName: requiredString(args.contractName, "contractName"),
    expectedVersion: normalizeExpectedVersion(args.expectedVersion),
    write: normalizeStateWrite(args),
  })
}

async function deleteArtifact(
  ctx: ActionCtx,
  tenantId: string,
  args: Record<string, unknown>
) {
  return await ctx.runMutation(internal.artifacts.records.remove, {
    tenantId,
    artifactId: requiredArtifactId(args.artifactId),
  })
}

async function resolveArtifactId(
  ctx: ActionCtx,
  tenantId: string,
  args: Record<string, unknown>,
  runId: Id<"runs"> | undefined
) {
  if (typeof args.artifactId === "string") {
    return requiredArtifactId(args.artifactId)
  }

  if (runId === undefined) {
    throw new Error(
      "artifactId is required outside artifact-owned automation runs."
    )
  }

  const artifactId = await ctx.runQuery(
    internal.artifacts.queries.getArtifactIdForRun,
    { tenantId, runId }
  )

  if (artifactId === null) {
    throw new Error("No artifact is attached to this automation run.")
  }

  return artifactId
}
