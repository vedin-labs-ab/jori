import { type Infer } from "convex/values"
import {
  getToolPermission,
  isUnattendedToolMode,
  type PermissionMode,
  resolveToolMode,
  resolveToolModes,
} from "../../contracts/permissions"
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
import { createSight, type Gate, type Sight } from "../visibility/sight"
import { getOrganizationAutomation } from "./lifecycle/read"
import { type access, type accessInput } from "./schema"

export type AutomationAccess = Infer<typeof access>
export type AutomationAccessInput = Infer<typeof accessInput>
export type AccessLevel = "none" | "read" | "write" | "both"

type AutomationGateDoc = Pick<
  Doc<"automations">,
  "organizationId" | "visibility" | "principal" | "createdBy"
> &
  Partial<Pick<Doc<"automations">, "folderId">>

/** An automation's owner: the person it executes as, or its creator. */
export function automationOwner(
  automation: Pick<Doc<"automations">, "principal" | "createdBy">
): Id<"persons"> | undefined {
  return automation.principal.kind === "person"
    ? automation.principal.personId
    : automation.createdBy
}

/** The visibility gate for an automation, for Sight.canSee. */
export function automationGate(automation: AutomationGateDoc): Gate {
  return {
    organizationId: automation.organizationId,
    ownerId: automationOwner(automation),
    folderId: automation.folderId,
    visibility: automation.visibility,
  }
}

/** Whether the viewer behind the Sight may see the automation. */
export async function canSeeAutomation(
  sight: Sight,
  automation: AutomationGateDoc
) {
  return await sight.canSee(automationGate(automation))
}

/** Missing, foreign, and invisible automations read the same, so a caller
 *  cannot probe what exists behind a visibility gate. The folder tree's
 *  guard reads the same way for the same reason. */
export async function requireVisibleAutomation(
  ctx: QueryLikeCtx,
  args: {
    organizationId: string
    personId?: Id<"persons">
    automationId: Id<"automations">
  }
) {
  const automation = await getOrganizationAutomation(
    ctx,
    args.organizationId,
    args.automationId
  )

  if (!(await canSeeAutomation(createSight(ctx, args), automation))) {
    throw new Error("Automation not found.")
  }

  return automation
}

export async function resolveAccessInput(
  ctx: QueryLikeCtx,
  args: {
    access: AutomationAccessInput
    principal: ExecutionPrincipal
    organizationId: string
  }
): Promise<AutomationAccess> {
  const integrations = normalizeAccessIntegrations(args.access.integrations)

  await requireAutomationAccessPolicy(ctx, {
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
    organizationId: string
  }
) {
  if (args.integrations.length === 0) {
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

  if (!hasWriteTool) {
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

export function canUseAutomationTool(
  access: AutomationAccess,
  integrationId: Id<"integrations">,
  tool: string
) {
  return getIntegrationTools(access, integrationId).includes(tool)
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
