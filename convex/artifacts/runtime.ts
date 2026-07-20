import { v } from "convex/values"
import {
  getToolPermission,
  resolveToolMode,
  resolveToolModes,
} from "../../contracts/permissions"
import { type Doc, type Id } from "../_generated/dataModel"
import { internalQuery, type QueryCtx } from "../_generated/server"
import { listPermissionOverrides } from "../permissions/read"
import { isUserScopedIntegration } from "../shared/integrations"
import { getAccessibleArtifact } from "./access"

export const authorizeTool = internalQuery({
  args: {
    organizationId: v.string(),
    artifactId: v.id("artifacts"),
    versionId: v.id("artifactVersions"),
    personId: v.id("persons"),
    tool: v.string(),
    integrationId: v.optional(v.id("integrations")),
  },
  handler: async (ctx, args) => {
    const permission = getToolPermission(args.tool)

    if (permission === undefined) {
      throw new Error(`Unknown artifact tool: ${args.tool}`)
    }

    const artifact = await getAccessibleArtifact(ctx, args)

    if (artifact.archivedAt !== undefined) {
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
      resolveToolModes(await listPermissionOverrides(ctx, args.organizationId)),
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
            organizationId: args.organizationId,
            personId: args.personId,
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
    organizationId: string
    personId: Id<"persons">
    surface: Exclude<Doc<"integrations">["integration"], "milo">
    integrationId?: Id<"integrations">
  }
) {
  if (args.integrationId !== undefined) {
    const integration = await ctx.db.get(args.integrationId)

    return isUsableIntegration(integration, args) ? integration : null
  }

  if (isUserScopedIntegration(args.surface)) {
    const integration = await ctx.db
      .query("integrations")
      .withIndex("by_organization_and_integration_and_owner", (index) =>
        index
          .eq("organizationId", args.organizationId)
          .eq("integration", args.surface)
          .eq("ownerId", args.personId)
      )
      .first()

    return isUsableIntegration(integration, args) ? integration : null
  }

  const integration = await ctx.db
    .query("integrations")
    .withIndex("by_organization_and_integration", (index) =>
      index
        .eq("organizationId", args.organizationId)
        .eq("integration", args.surface)
    )
    .first()

  return isUsableIntegration(integration, args) ? integration : null
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
    organizationId: string
    personId: Id<"persons">
    surface: Doc<"integrations">["integration"]
  }
) {
  if (
    integration === null ||
    integration.organizationId !== args.organizationId ||
    integration.status !== "active" ||
    integration.integration !== args.surface
  ) {
    return false
  }

  return (
    !isUserScopedIntegration(integration.integration) ||
    integration.ownerId === args.personId
  )
}
