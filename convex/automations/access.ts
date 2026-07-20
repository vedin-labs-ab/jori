import { type Infer } from "convex/values"
import {
  getToolPermission,
  isUnattendedToolMode,
  type PermissionMode,
  resolveToolMode,
  resolveToolModes,
} from "../../contracts/permissions"
import { type Scope } from "../../contracts/permissions/scope"
import { type Doc, type Id } from "../_generated/dataModel"
import { resolveIntegrationForPrincipal } from "../integrations/resolve"
import { listPermissionOverrides } from "../permissions/read"
import { type ExecutionPrincipal } from "../runs/principal"
import { type QueryLikeCtx } from "../shared/context"
import {
  getIntegrationTools,
  type Integration,
  integrationLabels,
} from "../shared/integrations"
import { type access, type accessInput } from "./schema"

export type AutomationAccess = Infer<typeof access>
export type AutomationAccessInput = Infer<typeof accessInput>
export type AccessLevel = "none" | "read" | "write" | "both"

export function automationScope(
  automation: Pick<Doc<"automations">, "scope">
): Scope {
  return automation.scope
}

/**
 * Organization automations belong to every member; personal ones to the
 * person named by their execution principal.
 */
export function canAccessAutomation(
  automation: Pick<Doc<"automations">, "scope" | "principal">,
  personId: Id<"persons"> | undefined
) {
  return (
    automationScope(automation) === "organization" ||
    (automation.principal.kind === "person" &&
      automation.principal.personId === personId)
  )
}

export async function resolveAccessInput(
  ctx: QueryLikeCtx,
  args: {
    access: AutomationAccessInput
    artifactId?: Id<"artifacts">
    principal: ExecutionPrincipal
    organizationId: string
  }
): Promise<AutomationAccess> {
  const integrations = normalizeAccessIntegrations(args.access.integrations)

  await requireAutomationAccessPolicy(ctx, {
    allowArtifactStateWrite: args.artifactId !== undefined,
    integrations,
    organizationId: args.organizationId,
  })

  return {
    integrations: await Promise.all(
      integrations.map(async (integration) => ({
        id: (
          await resolveIntegrationForPrincipal(ctx, {
            integration: integration.integration,
            principal: args.principal,
            organizationId: args.organizationId,
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
    organizationId: string
  }
) {
  if (args.integrations.length === 0) {
    if (args.allowArtifactStateWrite === true) {
      return
    }

    throw new Error("Select at least one integration tool.")
  }

  const toolModes = resolveToolModes(
    await listPermissionOverrides(ctx, args.organizationId)
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
  return resolveToolAccessLevel(getIntegrationTools(access, integrationId))
}

export function canUseAutomationTool(
  access: AutomationAccess,
  integrationId: Id<"integrations">,
  tool: string
) {
  return getIntegrationTools(access, integrationId).includes(tool)
}

/**
 * Names of integrations the automation is bound to that are no longer usable
 * (disconnected, expired credentials). Runs drop these bound integrations, so
 * the automation cannot do its work until they are reconnected. Integration
 * rows survive disconnects, so bound references stay resolvable; automations
 * created before that guarantee may still hold dangling references, which are
 * omitted from display projections as well.
 */
export async function listInactiveAccessIntegrations(
  ctx: QueryLikeCtx,
  access: AutomationAccess
): Promise<Integration[]> {
  const inactive: Integration[] = []

  for (const entry of access.integrations) {
    const integration = await ctx.db.get(entry.id)

    if (integration !== null && integration.status !== "active") {
      inactive.push(integration.integration)
    }
  }

  return inactive
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

export function resolveToolAccessLevel(tools: readonly string[]): AccessLevel {
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
