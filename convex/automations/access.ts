import { type Infer } from "convex/values"
import { type Id } from "../_generated/dataModel"
import { type MutationCtx, type QueryCtx } from "../_generated/server"
import { type Integration } from "../integrations/catalog"
import {
  getToolPermission,
  isUnattendedToolMode,
  type PermissionMode,
  resolveToolMode,
  resolveToolModes,
} from "../permissions/catalog"
import { listPermissionOverrides } from "../permissions/read"
import { integrationLabels, resolveEventIntegration } from "./integrations"
import { type access, type accessInput } from "./schema"

export type AutomationAccess = Infer<typeof access>
export type AutomationAccessInput = Infer<typeof accessInput>
export type AccessLevel = "none" | "read" | "write" | "both"
type QueryLikeCtx = MutationCtx | QueryCtx

export async function resolveAccessInput(
  ctx: QueryLikeCtx,
  args: {
    access: AutomationAccessInput
    createdBy: string | undefined
    tenantId: string
  }
): Promise<AutomationAccess> {
  const integrations = normalizeAccessIntegrations(args.access.integrations)

  await requireAutomationAccessPolicy(ctx, {
    integrations,
    tenantId: args.tenantId,
  })

  return {
    integrations: await Promise.all(
      integrations.map(async (integration) => ({
        integrationId: (
          await resolveEventIntegration(ctx, {
            createdBy: args.createdBy,
            provider: integration.provider,
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
      provider: Integration
      tools: string[]
    }>
    tenantId: string
  }
) {
  if (args.integrations.length === 0) {
    throw new Error("Select at least one integration tool.")
  }

  const toolModes = resolveToolModes(
    await listPermissionOverrides(ctx, args.tenantId)
  )
  let hasWriteTool = false

  for (const integration of args.integrations) {
    for (const tool of integration.tools) {
      const permission = getToolPermission(tool)

      if (
        permission === undefined ||
        permission.provider !== integration.provider
      ) {
        throw new Error(
          `Unknown ${integrationLabels[integration.provider]} tool: ${tool}`
        )
      }

      const mode = resolveToolMode(toolModes, tool)

      if (!isUnattendedToolMode(mode)) {
        throw new Error(
          `${permission.label} is ${permissionModeLabel(mode)} and cannot run in automations.`
        )
      }

      if (permission.access === "write") {
        hasWriteTool = true
      }
    }
  }

  if (!hasWriteTool) {
    throw new Error("Give at least one integration write tool.")
  }
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
    access.integrations.find(
      (integration) => integration.integrationId === integrationId
    )?.tools ?? []
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
    provider: Integration
    access: Exclude<AccessLevel, "none">
    tools: string[]
  }> = []

  for (const entry of access.integrations) {
    const integration = await ctx.db.get(entry.integrationId)

    if (integration === null) {
      continue
    }

    const level = getToolAccess(entry.tools)

    if (level !== "none") {
      surfaces.push({
        provider: integration.provider,
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
  const toolsByProvider = new Map<Integration, Set<string>>()

  for (const integration of integrations) {
    const tools = uniqueTools(integration.tools)

    if (tools.length === 0) {
      throw new Error(
        "Select at least one tool for each mentioned integration."
      )
    }

    const providerTools = toolsByProvider.get(integration.provider) ?? new Set()

    for (const tool of tools) {
      providerTools.add(tool)
    }

    toolsByProvider.set(integration.provider, providerTools)
  }

  return [...toolsByProvider].map(([provider, tools]) => ({
    provider,
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
    provider: Integration
  },
>(surfaces: Surface[]) {
  return [...surfaces].sort((left, right) =>
    integrationLabels[left.provider].localeCompare(
      integrationLabels[right.provider]
    )
  )
}
