import { v } from "convex/values"
import { getToolPermission } from "../../contracts/permissions"
import { query } from "../_generated/server"
import { requireTenantAccess } from "../access"
import {
  getToolInputSchema,
  type JsonSchema,
} from "../runs/agent/tools/schemas"
import { getToolResponseSchema } from "../runs/agent/tools/schemas/responses"
import { runLifecycleTools } from "../runtime/lifecycle"
import { sandboxTools } from "../runtime/sandbox"
import { activeSurfaceToolReferenceSchemas } from "../runtime/surface/tools"

/** What a tool call looks like on the wire: the request schema the agent
 *  fills in, and the shape of what comes back. Every permissioned tool has
 *  both; the coverage test enforces it, so a miss here is a real bug. */
export function resolveToolReference(tool: string) {
  const permission = getToolPermission(tool)
  const request =
    getToolInputSchema(tool) ??
    nativeToolInputSchema(tool) ??
    activeSurfaceToolReferenceSchemas()[tool]
  const response = getToolResponseSchema(tool)

  if (
    permission === undefined ||
    request === undefined ||
    response === undefined
  ) {
    throw new Error("Unknown tool.")
  }

  return { request, response }
}

export const get = query({
  args: {
    tenantId: v.string(),
    tool: v.string(),
  },
  handler: async (ctx, args) => {
    await requireTenantAccess(ctx, args.tenantId)

    return resolveToolReference(args.tool)
  },
})

/** Native tools carry their schemas on the runtime definitions. */
function nativeToolInputSchema(tool: string): JsonSchema | undefined {
  return [...sandboxTools, ...runLifecycleTools()].find(
    (definition) => definition.name === tool
  )?.inputSchema
}
