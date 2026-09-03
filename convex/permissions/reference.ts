import { v } from "convex/values"
import { getToolPermission } from "../../contracts/permissions"
import { query } from "../_generated/server"
import { requireOrganizationAccess } from "../access"
import {
  getToolInputSchema,
  type JsonSchema,
} from "../runs/agent/tools/schemas"
import { getToolResponseSchema } from "../runs/agent/tools/schemas/responses"
import { runLifecycleTools, sandboxTools } from "../runtime/native"
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

/** One round trip resolves every schema a view can ask about, so opening
 *  a schema dialog never waits on a second request. */
export const list = query({
  args: {
    organizationId: v.string(),
    tools: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    await requireOrganizationAccess(ctx, args.organizationId)

    return Object.fromEntries(
      args.tools.slice(0, 50).map((tool) => [tool, resolveToolReference(tool)])
    )
  },
})

/** Native tools carry their schemas on the runtime definitions. */
function nativeToolInputSchema(tool: string): JsonSchema | undefined {
  return [...sandboxTools, ...runLifecycleTools()].find(
    (definition) => definition.name === tool
  )?.inputSchema
}
