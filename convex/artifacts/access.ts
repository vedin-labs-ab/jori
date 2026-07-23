import { type Doc, type Id } from "../_generated/dataModel"
import { type QueryCtx } from "../_generated/server"
import { type QueryLikeCtx } from "../shared/context"
import { boundedNumber, optionalString } from "../shared/input"

const artifactSummaryLimit = 100

export async function searchArtifacts(
  ctx: QueryCtx,
  args: {
    organizationId: string
    personId: Id<"persons">
    query?: string
    includeArchived?: boolean
    limit?: number
  }
) {
  const query = normalizeSearch(args.query)
  const limit = boundedNumber(args.limit, 25, 1, artifactSummaryLimit)
  const artifacts = await ctx.db
    .query("artifacts")
    .withIndex("by_organization_and_updated_at", (index) =>
      index.eq("organizationId", args.organizationId)
    )
    .order("desc")
    .take(artifactSummaryLimit)

  return artifacts
    .filter(
      (artifact) =>
        canAccessArtifact(artifact, args.personId) &&
        (args.includeArchived === true || artifact.archivedAt === undefined) &&
        matchesArtifactQuery(artifact, query)
    )
    .slice(0, limit)
}

export function canAccessArtifact(
  artifact: Pick<Doc<"artifacts">, "access" | "ownerId">,
  personId: Id<"persons">
) {
  return artifact.access === "organization" || artifact.ownerId === personId
}

/** Load an artifact only if it is in the organization and visible to the person;
 *  null otherwise, so callers cannot tell missing from inaccessible. */
export async function findAccessibleArtifact(
  ctx: QueryLikeCtx,
  args: {
    organizationId: string
    artifactId: Id<"artifacts">
    personId: Id<"persons">
  }
) {
  const artifact = await ctx.db.get(args.artifactId)

  if (
    artifact === null ||
    artifact.organizationId !== args.organizationId ||
    !canAccessArtifact(artifact, args.personId)
  ) {
    return null
  }

  return artifact
}

export async function getAccessibleArtifact(
  ctx: QueryLikeCtx,
  args: {
    organizationId: string
    artifactId: Id<"artifacts">
    personId: Id<"persons">
  }
) {
  const artifact = await findAccessibleArtifact(ctx, args)

  if (artifact === null) {
    throw new Error("Artifact not found.")
  }

  return artifact
}

export function summarizeArtifact(artifact: Doc<"artifacts">) {
  return {
    artifactId: artifact._id,
    title: artifact.title,
    access: artifact.access,
    contract: artifact.contract,
    ownerId: artifact.ownerId,
    versionId: artifact.versionId,
    createdAt: artifact.createdAt,
    updatedAt: artifact.updatedAt,
    archivedAt: artifact.archivedAt,
  }
}

function normalizeSearch(query: string | undefined) {
  return optionalString(query)?.toLowerCase()
}

function matchesArtifactQuery(
  artifact: Doc<"artifacts">,
  query: string | undefined
) {
  return query === undefined || artifact.title.toLowerCase().includes(query)
}
