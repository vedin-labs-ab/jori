import { isWebTool } from "../../contracts/permissions/web"
import { type Doc } from "../_generated/dataModel"
import { listActiveIntegrationsForPrincipal } from "../integrations/data"
import {
  getToolPermissionsBySurface,
  type ToolSurface,
} from "../permissions/catalog"
import { type QueryLikeCtx } from "../shared/context"
import { type Access } from "../shared/integrations"

/**
 * The tool contract a spawned agent run inherits: the parent's own access,
 * optionally narrowed to the requested tool names. A subtask can never hold
 * access its parent lacks — requested names outside the parent's contract
 * are dropped, and web tools stay off unless the parent has them.
 */
export async function resolveSubtaskAccess(
  ctx: QueryLikeCtx,
  args: {
    parent: Doc<"runs">
    tools?: readonly string[]
  }
): Promise<Access | undefined> {
  const parentAccess = await parentRunAccess(ctx, args.parent)

  if (args.tools === undefined) {
    return parentAccess
  }

  const requested = new Set(args.tools)
  const grantable = await grantableIntegrations(ctx, args.parent, parentAccess)

  return {
    integrations: grantable
      .map((entry) => ({
        id: entry.id,
        tools: entry.tools.filter((tool) => requested.has(tool)),
      }))
      .filter((entry) => entry.tools.length > 0),
    web: (parentAccess?.web ?? true) && args.tools.some(isWebTool),
  }
}

/** Every constrained run carries its immutable contract on the run. */
async function parentRunAccess(
  _ctx: QueryLikeCtx,
  parent: Doc<"runs">
): Promise<Access | undefined> {
  return parent.access
}

/**
 * The integration tools the parent may pass on. A parent without a contract
 * of its own holds the full tool surface, so it may pass on every catalog
 * tool of its active integrations.
 */
async function grantableIntegrations(
  ctx: QueryLikeCtx,
  parent: Doc<"runs">,
  parentAccess: Access | undefined
): Promise<Access["integrations"]> {
  if (parentAccess !== undefined) {
    return parentAccess.integrations
  }

  const integrations = await listActiveIntegrationsForPrincipal(ctx, {
    principal: parent.principal,
    tenantId: parent.tenantId,
  })

  return integrations.map((integration) => ({
    id: integration._id,
    tools: getToolPermissionsBySurface(integration.integration as ToolSurface, {
      routes: ["broker"],
    }).map((permission) => permission.tool),
  }))
}
