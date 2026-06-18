import { type Doc } from "../_generated/dataModel"
import { type QueryCtx } from "../_generated/server"

const artifactSummaryLimit = 100

export async function searchArtifacts(
  ctx: QueryCtx,
  args: {
    tenantId: string
    userId: string
    query?: string
    includeArchived?: boolean
    limit?: number
  }
) {
  const query = normalizeSearch(args.query)
  const limit = normalizeLimit(args.limit)
  const artifacts = await ctx.db
    .query("artifacts")
    .withIndex("by_tenant_and_updated_at", (index) =>
      index.eq("tenantId", args.tenantId)
    )
    .order("desc")
    .take(artifactSummaryLimit)

  return artifacts
    .filter(
      (artifact) =>
        canAccessArtifact(artifact, args.userId) &&
        (args.includeArchived === true || artifact.archivedAt === undefined) &&
        matchesArtifactQuery(artifact, query)
    )
    .slice(0, limit)
}

export function canAccessArtifact(
  artifact: Pick<Doc<"artifacts">, "access" | "ownerId">,
  userId: string
) {
  return artifact.access === "organization" || artifact.ownerId === userId
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
  const normalized = query?.trim().toLowerCase()

  return normalized === "" ? undefined : normalized
}

function normalizeLimit(limit: number | undefined) {
  if (limit === undefined || !Number.isFinite(limit)) {
    return 25
  }

  return Math.max(1, Math.min(artifactSummaryLimit, Math.trunc(limit)))
}

function matchesArtifactQuery(
  artifact: Doc<"artifacts">,
  query: string | undefined
) {
  return query === undefined || artifact.title.toLowerCase().includes(query)
}
