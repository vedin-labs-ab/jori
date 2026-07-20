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
    organizationId: string
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
      return await createArtifact(ctx, execution.organizationId, personId, args)
    case "update_artifact":
      return await updateArtifact(ctx, execution.organizationId, personId, args)
    case "search_artifacts":
      return await searchArtifacts(
        ctx,
        execution.organizationId,
        personId,
        args
      )
    case "read_artifact":
      return await readArtifact(ctx, execution.organizationId, personId, args)
    case "read_artifact_state":
      return await readArtifactState(ctx, execution, personId, args)
    case "update_artifact_state":
      return await updateArtifactState(ctx, execution, personId, args)
    case "share_artifact":
      return await shareArtifact(ctx, execution.organizationId, personId, args)
    case "delete_artifact":
      return await deleteArtifact(ctx, execution.organizationId, args)
    default:
      throw new Error(`Unknown Milo artifact tool: ${request.tool}`)
  }
}

async function createArtifact(
  ctx: ActionCtx,
  organizationId: string,
  personId: Id<"persons">,
  args: Record<string, unknown>
): Promise<unknown> {
  if (typeof args.template === "string") {
    return await ctx.runAction(
      internal.artifacts.actions.instantiateFromAgent,
      {
        organizationId,
        personId,
        template: args.template,
        title: optionalString(args.title),
        access:
          args.access === undefined ? undefined : normalizeAccess(args.access),
        message: optionalString(args.message),
      }
    )
  }

  return await ctx.runAction(internal.artifacts.actions.createFromAgent, {
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

async function updateArtifact(
  ctx: ActionCtx,
  organizationId: string,
  personId: Id<"persons">,
  args: Record<string, unknown>
): Promise<unknown> {
  return await ctx.runAction(internal.artifacts.actions.updateFromAgent, {
    organizationId,
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
  organizationId: string,
  personId: Id<"persons">,
  args: Record<string, unknown>
): Promise<unknown> {
  return await ctx.runQuery(internal.artifacts.queries.searchForAgent, {
    organizationId,
    personId,
    query: optionalString(args.query),
    includeArchived: args.includeArchived === true,
    limit: boundedNumber(args.limit, 25, 1, 100),
  })
}

async function readArtifact(
  ctx: ActionCtx,
  organizationId: string,
  personId: Id<"persons">,
  args: Record<string, unknown>
): Promise<unknown> {
  const artifactId = requiredArtifactId(args.artifactId)
  const metadata = (await ctx.runQuery(
    internal.artifacts.queries.readForAgent,
    {
      organizationId,
      personId,
      artifactId,
    }
  )) as Record<string, unknown> | null

  if (metadata === null) {
    return null
  }

  const source = (await ctx.runAction(internal.artifacts.actions.readForAgent, {
    organizationId,
    artifactId,
    versionId: optionalString(args.versionId) as
      | Id<"artifactVersions">
      | undefined,
  })) as { files?: unknown[] } | null

  return { ...metadata, source: source?.files ?? [] }
}

async function readArtifactState(
  ctx: ActionCtx,
  execution: { organizationId: string; runId?: Id<"runs"> },
  personId: Id<"persons">,
  args: Record<string, unknown>
) {
  return await ctx.runQuery(internal.artifacts.state.read, {
    organizationId: execution.organizationId,
    personId,
    artifactId: await resolveArtifactId(
      ctx,
      execution.organizationId,
      args,
      execution.runId
    ),
    contractName: requiredString(args.contractName, "contractName"),
  })
}

async function updateArtifactState(
  ctx: ActionCtx,
  execution: { organizationId: string; runId?: Id<"runs"> },
  personId: Id<"persons">,
  args: Record<string, unknown>
) {
  return await ctx.runMutation(internal.artifacts.state.update, {
    organizationId: execution.organizationId,
    personId,
    artifactId: await resolveArtifactId(
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

async function shareArtifact(
  ctx: ActionCtx,
  organizationId: string,
  personId: Id<"persons">,
  args: Record<string, unknown>
) {
  return await ctx.runMutation(internal.artifacts.serve.share.mint, {
    organizationId,
    personId,
    artifactId: requiredArtifactId(args.artifactId),
    expiresInHours:
      typeof args.expiresInHours === "number" ? args.expiresInHours : undefined,
  })
}

async function deleteArtifact(
  ctx: ActionCtx,
  organizationId: string,
  args: Record<string, unknown>
) {
  return await ctx.runMutation(internal.artifacts.records.remove, {
    organizationId,
    artifactId: requiredArtifactId(args.artifactId),
  })
}

async function resolveArtifactId(
  ctx: ActionCtx,
  organizationId: string,
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
    { organizationId, runId }
  )

  if (artifactId === null) {
    throw new Error("No artifact is attached to this automation run.")
  }

  return artifactId
}
