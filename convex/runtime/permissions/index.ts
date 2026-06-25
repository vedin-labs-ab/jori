import { internal } from "../../_generated/api"
import { type ActionCtx } from "../../_generated/server"
import { resolveToolModes } from "../../permissions/catalog"
import { type AgentRuntimeInput } from "../../runs/agent/input"
import { createRuntimeToolCapability } from "../../runs/agent/tools/bundles"
import { permissionGroups, toolDescriptor } from "./tools"

export async function runtimePermissions(
  ctx: ActionCtx,
  input: AgentRuntimeInput,
  skillNames: readonly string[] = []
) {
  const overrides = await ctx.runQuery(
    internal.permissions.tools.listForRuntime,
    {
      tenantId: input.run.tenantId,
    }
  )
  const toolModes = resolveToolModes(overrides)
  const groups = permissionGroups(input, toolModes)
  const capabilities = groups.map((group) =>
    createRuntimeToolCapability(group.surface, group.permissions, toolModes)
  )
  const tools = groups.flatMap((group) =>
    group.permissions.map((permission) =>
      toolDescriptor(group.surface, permission, toolModes, skillNames)
    )
  )

  return {
    all: groups.flatMap((group) => group.permissions),
    capabilities,
    tools,
    toolModes,
  }
}

export type RuntimePermissions = Awaited<ReturnType<typeof runtimePermissions>>
