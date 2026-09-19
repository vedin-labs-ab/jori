import {
  getGrantableToolPermissions,
  isCoreTool,
  type ToolPermission,
  type ToolSurface,
} from "../../contracts/permissions"
import { type Doc } from "../_generated/dataModel"
import { listActiveIntegrationsForPrincipal } from "../integrations/data"
import { type QueryLikeCtx } from "../shared/context"
import { type Access, getIntegrationTools } from "../shared/integrations"
import { type AgentRuntimeInput, inputAccess } from "./agent/input"

/**
 * Whether a run holds a tool. Every run holds the core tools, and a run
 * without a contract holds the full surface; any other tool has to be in the
 * contract. The tool list a run is shown and the broker that executes its
 * calls both ask here, so what a run sees is what it can do.
 */
export function holdsTool(
  input: AgentRuntimeInput,
  permission: Pick<ToolPermission, "surface" | "tool">
) {
  const access = inputAccess(input)

  if (access === undefined || isCoreTool(permission.tool)) {
    return true
  }

  if (permission.surface === "jori") {
    return access.jori.includes(permission.tool)
  }

  return input.integrations.some(
    (integration) =>
      integration.integration === permission.surface &&
      getIntegrationTools(access, integration._id).includes(permission.tool)
  )
}

/**
 * The tool contract a spawned agent run inherits: the parent's own access,
 * optionally narrowed to the requested tool names. A subtask can never hold
 * access its parent lacks — requested names outside the parent's contract
 * are dropped.
 */
export async function resolveSubtaskAccess(
  ctx: QueryLikeCtx,
  args: {
    parent: Doc<"runs">
    tools?: readonly string[]
  }
): Promise<Access | undefined> {
  if (args.tools === undefined) {
    return args.parent.access
  }

  const requested = new Set(args.tools)
  const grantable = args.parent.access ?? (await fullAccess(ctx, args.parent))

  return {
    integrations: grantable.integrations
      .map((entry) => ({
        id: entry.id,
        tools: entry.tools.filter((tool) => requested.has(tool)),
      }))
      .filter((entry) => entry.tools.length > 0),
    jori: grantable.jori.filter((tool) => requested.has(tool)),
  }
}

/**
 * What a parent without a contract may pass on: it holds the full tool
 * surface, so every grantable tool of Jori's and of its active integrations.
 */
async function fullAccess(
  ctx: QueryLikeCtx,
  parent: Doc<"runs">
): Promise<Access> {
  const integrations = await listActiveIntegrationsForPrincipal(ctx, {
    principal: parent.principal,
    organizationId: parent.organizationId,
  })

  return {
    integrations: integrations.map((integration) => ({
      id: integration._id,
      tools: grantableTools(integration.integration),
    })),
    jori: grantableTools("jori"),
  }
}

function grantableTools(surface: ToolSurface) {
  return getGrantableToolPermissions(surface).map(
    (permission) => permission.tool
  )
}
