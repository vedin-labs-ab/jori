import { v } from "convex/values"
import { type Doc, type Id } from "../_generated/dataModel"
import { internalQuery, type QueryCtx } from "../_generated/server"
import { isUserScopedIntegration } from "../integrations/catalog"
import {
  getToolPermission,
  resolveToolMode,
  resolveToolModes,
} from "../permissions/catalog"
import { listPermissionOverrides } from "../permissions/read"
import { canAccessArtifact } from "./access"

export const authorizeTool = internalQuery({
  args: {
    tenantId: v.string(),
    artifactId: v.id("artifacts"),
    versionId: v.id("artifactVersions"),
    userId: v.string(),
    tool: v.string(),
    integrationId: v.optional(v.id("integrations")),
  },
  handler: async (ctx, args) => {
    const permission = getToolPermission(args.tool)

    if (permission === undefined) {
      throw new Error(`Unknown artifact tool: ${args.tool}`)
    }

    const artifact = await ctx.db.get(args.artifactId)

    if (
      artifact === null ||
      artifact.tenantId !== args.tenantId ||
      artifact.archivedAt !== undefined ||
      !canAccessArtifact(artifact, args.userId)
    ) {
      throw new Error("Artifact not found.")
    }

    const capability = await findActiveCapability(ctx, {
      artifactId: args.artifactId,
      versionId: args.versionId,
      tool: args.tool,
      integrationId: args.integrationId,
    })

    if (capability === null) {
      throw new Error(`Artifact is not allowed to use tool: ${args.tool}`)
    }

    const mode = resolveToolMode(
      resolveToolModes(await listPermissionOverrides(ctx, args.tenantId)),
      args.tool
    )

    if (mode === "blocked") {
      throw new Error(`Tool is blocked: ${args.tool}`)
    }

    if (mode === "prompted") {
      throw new Error(`Tool requires approval: ${args.tool}`)
    }

    const integration =
      permission.surface === "milo"
        ? null
        : await findRuntimeIntegration(ctx, {
            tenantId: args.tenantId,
            userId: args.userId,
            surface: permission.surface,
            integrationId: capability.integrationId ?? args.integrationId,
          })

    if (permission.surface !== "milo" && integration === null) {
      throw new Error(
        `No active ${permission.surface} integration is available`
      )
    }

    return {
      permission,
      integration,
    }
  },
})

async function findActiveCapability(
  ctx: QueryCtx,
  args: {
    artifactId: Id<"artifacts">
    versionId: Id<"artifactVersions">
    tool: string
    integrationId?: Id<"integrations">
  }
) {
  const capabilities = await ctx.db
    .query("artifactTools")
    .withIndex("by_artifact_and_tool", (index) =>
      index.eq("artifactId", args.artifactId).eq("tool", args.tool)
    )
    .take(50)

  return (
    capabilities.find(
      (capability) =>
        capability.revokedAt === undefined &&
        (capability.versionId === undefined ||
          capability.versionId === args.versionId) &&
        matchesIntegration(capability, args.integrationId)
    ) ?? null
  )
}

async function findRuntimeIntegration(
  ctx: QueryCtx,
  args: {
    tenantId: string
    userId: string
    surface: Exclude<Doc<"integrations">["integration"], "milo">
    integrationId?: Id<"integrations">
  }
) {
  if (args.integrationId !== undefined) {
    const integration = await ctx.db.get(args.integrationId)

    return isUsableIntegration(integration, args) ? integration : null
  }

  const integrations = await ctx.db
    .query("integrations")
    .withIndex("by_tenant_and_status", (index) =>
      index.eq("tenantId", args.tenantId).eq("status", "active")
    )
    .collect()

  return (
    integrations.find((integration) =>
      isUsableIntegration(integration, args)
    ) ?? null
  )
}

function matchesIntegration(
  capability: Pick<Doc<"artifactTools">, "integrationId">,
  integrationId: Id<"integrations"> | undefined
) {
  return (
    integrationId === undefined ||
    capability.integrationId === undefined ||
    capability.integrationId === integrationId
  )
}

function isUsableIntegration(
  integration: Doc<"integrations"> | null,
  args: {
    tenantId: string
    userId: string
    surface: Doc<"integrations">["integration"]
  }
) {
  if (
    integration === null ||
    integration.tenantId !== args.tenantId ||
    integration.status !== "active" ||
    integration.integration !== args.surface
  ) {
    return false
  }

  return (
    !isUserScopedIntegration(integration.integration) ||
    integration.ownerId === args.userId
  )
}
