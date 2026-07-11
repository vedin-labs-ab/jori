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
  requiredArtifactId,
} from "./tools/args"
import { normalizeExpectedVersion, normalizeStateWrite } from "./tools/input"

const artifactTools = new Set([
  "create_artifact",
  "read_artifact_state",
  "read_artifact",
  "search_artifacts",
  "share_artifact",
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
    createdBy?: Id<"persons">
    runId?: Id<"runs">
  },
  request: MiloToolRequest
): Promise<unknown> {
  const args = normalizeToolArgs(request.args)
  const personId = execution.createdBy

  if (personId === undefined) {
    throw new Error("Artifact tools require an authenticated execution user.")
  }

  switch (request.tool) {
    case "create_artifact":
      return await createArtifact(ctx, execution.tenantId, personId, args)
    case "update_artifact":
      return await updateArtifact(ctx, execution.tenantId, personId, args)
    case "search_artifacts":
      return await searchArtifacts(ctx, execution.tenantId, personId, args)
    case "read_artifact":
      return await readArtifact(ctx, execution.tenantId, personId, args)
    case "read_artifact_state":
      return await readArtifactState(ctx, execution, personId, args)
    case "update_artifact_state":
      return await updateArtifactState(ctx, execution, personId, args)
    case "share_artifact":
      return await shareArtifact(ctx, execution.tenantId, personId, args)
    case "delete_artifact":
      return await deleteArtifact(ctx, execution.tenantId, args)
    default:
      throw new Error(`Unknown Milo artifact tool: ${request.tool}`)
  }
}

async function createArtifact(
  ctx: ActionCtx,
  tenantId: string,
  personId: Id<"persons">,
  args: Record<string, unknown>
): Promise<unknown> {
  return await ctx.runAction(internal.artifacts.actions.createFromAgent, {
    tenantId,
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

async function updateArtifact(
  ctx: ActionCtx,
  tenantId: string,
  personId: Id<"persons">,
  args: Record<string, unknown>
): Promise<unknown> {
  return await ctx.runAction(internal.artifacts.actions.updateFromAgent, {
    tenantId,
    personId,
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
  personId: Id<"persons">,
  args: Record<string, unknown>
): Promise<unknown> {
  return await ctx.runQuery(internal.artifacts.queries.searchForAgent, {
    tenantId,
    personId,
    query: optionalString(args.query),
    includeArchived: args.includeArchived === true,
    limit: boundedNumber(args.limit, 25, 1, 100),
  })
}

async function readArtifact(
  ctx: ActionCtx,
  tenantId: string,
  personId: Id<"persons">,
  args: Record<string, unknown>
): Promise<unknown> {
  const artifactId = requiredArtifactId(args.artifactId)
  const metadata = (await ctx.runQuery(
    internal.artifacts.queries.readForAgent,
    {
      tenantId,
      personId,
      artifactId,
    }
  )) as Record<string, unknown> | null

  if (metadata === null) {
    return null
  }

  const source = (await ctx.runAction(internal.artifacts.actions.readForAgent, {
    tenantId,
    artifactId,
    versionId: optionalString(args.versionId) as
      | Id<"artifactVersions">
      | undefined,
  })) as { files?: unknown[] } | null

  return { ...metadata, source: source?.files ?? [] }
}

async function readArtifactState(
  ctx: ActionCtx,
  execution: { tenantId: string; runId?: Id<"runs"> },
  personId: Id<"persons">,
  args: Record<string, unknown>
) {
  return await ctx.runQuery(internal.artifacts.state.read, {
    tenantId: execution.tenantId,
    personId,
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
  personId: Id<"persons">,
  args: Record<string, unknown>
) {
  return await ctx.runMutation(internal.artifacts.state.update, {
    tenantId: execution.tenantId,
    personId,
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

async function shareArtifact(
  ctx: ActionCtx,
  tenantId: string,
  personId: Id<"persons">,
  args: Record<string, unknown>
) {
  return await ctx.runMutation(internal.artifacts.serve.share.mint, {
    tenantId,
    personId,
    artifactId: requiredArtifactId(args.artifactId),
    expiresInHours:
      typeof args.expiresInHours === "number" ? args.expiresInHours : undefined,
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
