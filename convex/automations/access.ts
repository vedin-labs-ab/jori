import { type Infer } from "convex/values"
import { type Id } from "../_generated/dataModel"
import {
  getToolPermission,
  isUnattendedToolMode,
  type PermissionMode,
  resolveToolMode,
  resolveToolModes,
} from "../permissions/catalog"
import { listPermissionOverrides } from "../permissions/read"
import { type QueryLikeCtx } from "../shared/context"
import { type Integration } from "../shared/integrations"
import { integrationLabels, resolveEventIntegration } from "./integrations"
import { type access, type accessInput } from "./schema"

export type AutomationAccess = Infer<typeof access>
export type AutomationAccessInput = Infer<typeof accessInput>
export type AccessLevel = "none" | "read" | "write" | "both"

export async function resolveAccessInput(
  ctx: QueryLikeCtx,
  args: {
    access: AutomationAccessInput
    artifactId?: Id<"artifacts">
    createdBy: Id<"persons"> | undefined
    tenantId: string
  }
): Promise<AutomationAccess> {
  const integrations = normalizeAccessIntegrations(args.access.integrations)

  await requireAutomationAccessPolicy(ctx, {
    allowArtifactStateWrite: args.artifactId !== undefined,
    integrations,
    tenantId: args.tenantId,
  })

  return {
    integrations: await Promise.all(
      integrations.map(async (integration) => ({
        id: (
          await resolveEventIntegration(ctx, {
            createdBy: args.createdBy,
            integration: integration.integration,
            tenantId: args.tenantId,
          })
        )._id,
        tools: integration.tools,
      }))
    ),
    web: args.access.web,
  }
}

export async function requireAutomationAccessPolicy(
  ctx: QueryLikeCtx,
  args: {
    integrations: Array<{
      integration: Integration
      tools: string[]
    }>
    allowArtifactStateWrite?: boolean
    tenantId: string
  }
) {
  if (args.integrations.length === 0) {
    if (args.allowArtifactStateWrite === true) {
      return
    }

    throw new Error("Select at least one integration tool.")
  }

  const toolModes = resolveToolModes(
    await listPermissionOverrides(ctx, args.tenantId)
  )
  let hasWriteTool = false

  for (const integration of args.integrations) {
    for (const tool of integration.tools) {
      if (requireAutomationTool(toolModes, integration, tool)) {
        hasWriteTool = true
      }
    }
  }

  if (!hasWriteTool && args.allowArtifactStateWrite !== true) {
    throw new Error("Give at least one integration write tool.")
  }
}

function requireAutomationTool(
  toolModes: ReadonlyMap<string, PermissionMode>,
  integration: {
    integration: Integration
    tools: string[]
  },
  tool: string
) {
  const permission = getToolPermission(tool)

  if (
    permission === undefined ||
    permission.surface !== integration.integration
  ) {
    throw new Error(
      `Unknown ${integrationLabels[integration.integration]} tool: ${tool}`
    )
  }

  const mode = resolveToolMode(toolModes, tool)

  if (!isUnattendedToolMode(mode)) {
    throw new Error(
      `${permission.label} is ${permissionModeLabel(mode)} and cannot run in automations.`
    )
  }

  return permission.access === "write"
}

export function getIntegrationAccess(
  access: AutomationAccess,
  integrationId: Id<"integrations">
): AccessLevel {
  return getToolAccess(getIntegrationTools(access, integrationId))
}

export function getIntegrationTools(
  access: AutomationAccess,
  integrationId: Id<"integrations">
) {
  return (
    access.integrations.find((integration) => integration.id === integrationId)
      ?.tools ?? []
  )
}

export function hasIntegrationTools(
  access: AutomationAccess,
  integrationId: Id<"integrations">
) {
  return getIntegrationTools(access, integrationId).length > 0
}

export function canUseAutomationTool(
  access: AutomationAccess,
  integrationId: Id<"integrations">,
  tool: string
) {
  return getIntegrationTools(access, integrationId).includes(tool)
}

export async function projectAccessForConsole(
  ctx: QueryLikeCtx,
  access: AutomationAccess
) {
  const surfaces: Array<{
    integration: Integration
    access: Exclude<AccessLevel, "none">
    tools: string[]
  }> = []

  for (const entry of access.integrations) {
    const integration = await ctx.db.get(entry.id)

    if (integration === null) {
      continue
    }

    const level = getToolAccess(entry.tools)

    if (level !== "none") {
      surfaces.push({
        integration: integration.integration,
        access: level,
        tools: entry.tools,
      })
    }
  }

  return {
    webSearch: access.web,
    surfaces: sortSurfaces(surfaces),
  }
}

function normalizeAccessIntegrations(
  integrations: AutomationAccessInput["integrations"]
) {
  const toolsByIntegration = new Map<Integration, Set<string>>()

  for (const integration of integrations) {
    const tools = uniqueTools(integration.tools)

    if (tools.length === 0) {
      throw new Error(
        "Select at least one tool for each mentioned integration."
      )
    }

    const integrationTools =
      toolsByIntegration.get(integration.integration) ?? new Set()

    for (const tool of tools) {
      integrationTools.add(tool)
    }

    toolsByIntegration.set(integration.integration, integrationTools)
  }

  return [...toolsByIntegration].map(([integration, tools]) => ({
    integration,
    tools: [...tools],
  }))
}

function uniqueTools(tools: string[]) {
  return [...new Set(tools)]
}

function getToolAccess(tools: readonly string[]): AccessLevel {
  let read = false
  let write = false

  for (const tool of tools) {
    const permission = getToolPermission(tool)

    if (permission?.access === "read") {
      read = true
    }

    if (permission?.access === "write") {
      write = true
    }
  }

  if (read && write) {
    return "both"
  }

  if (read) {
    return "read"
  }

  return write ? "write" : "none"
}

function permissionModeLabel(mode: PermissionMode) {
  if (mode === "prompted") {
    return "set to ask first"
  }

  return mode === "blocked" ? "blocked" : mode
}

function sortSurfaces<
  Surface extends {
    integration: Integration
  },
>(surfaces: Surface[]) {
  return [...surfaces].sort((left, right) =>
    integrationLabels[left.integration].localeCompare(
      integrationLabels[right.integration]
    )
  )
}
