import { type Id } from "../_generated/dataModel"
import { type MutationCtx, type QueryCtx } from "../_generated/server"

export async function getTenantArtifact(
  ctx: QueryCtx | MutationCtx,
  args: {
    tenantId: string
    artifactId: Id<"artifacts">
  }
) {
  const artifact = await ctx.db.get(args.artifactId)

  if (artifact === null || artifact.tenantId !== args.tenantId) {
    throw new Error("Artifact not found.")
  }

  return artifact
}

export async function insertCapabilities(
  ctx: MutationCtx,
  args: {
    tenantId: string
    artifactId: Id<"artifacts">
    versionId: Id<"artifactVersions">
    approvedBy: string
    capabilities: Array<{
      tool: string
      integrationId?: Id<"integrations">
      versionPinned?: boolean
    }>
  }
) {
  const now = Date.now()

  for (const capability of args.capabilities) {
    await ctx.db.insert("artifactTools", {
      tenantId: args.tenantId,
      artifactId: args.artifactId,
      versionId: capability.versionPinned === true ? args.versionId : undefined,
      tool: capability.tool,
      integrationId: capability.integrationId,
      approvedBy: args.approvedBy,
      approvedAt: now,
    })
  }
}

export async function revokeCapabilities(
  ctx: MutationCtx,
  artifactId: Id<"artifacts">,
  now: number
) {
  const capabilities = await ctx.db
    .query("artifactTools")
    .withIndex("by_artifact", (index) => index.eq("artifactId", artifactId))
    .take(200)

  for (const capability of capabilities) {
    if (capability.revokedAt === undefined) {
      await ctx.db.patch(capability._id, { revokedAt: now })
    }
  }
}

export function normalizeTitle(title: string) {
  const normalized = title.trim()

  if (normalized === "") {
    throw new Error("Artifact title is required.")
  }

  return normalized.slice(0, 120)
}
