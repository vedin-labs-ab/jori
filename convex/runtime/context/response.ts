import { holdsTool } from "../../runs/access"
import { type AgentRuntimeInput } from "../../runs/agent/input"
import { assemblePrompt } from "../../runs/agent/prompt"
import {
  getPromptedTools,
  toolExecutionType,
} from "../../runs/agent/tools/policy"
import { createRunToolSnapshot } from "../../runs/agent/tools/snapshot"
import { type RuntimeSkill } from "../../skills/runtime"
import { runLifecycleTools, sandboxTools } from "../native"
import { type RuntimePermissions } from "../permissions/index"
import { visibleNativeToolSnapshots } from "../permissions/native"
import { type RuntimeContext, type RuntimeTool } from "../platform/types"
import { type loadActiveSurface } from "../surface"
import { type LoadedSandbox, type LoadedSession } from "./loaders"

type LoadedActiveSurface = Awaited<ReturnType<typeof loadActiveSurface>>

export function buildRuntimePrompt(
  input: AgentRuntimeInput,
  activeSurface: LoadedActiveSurface,
  permissions: RuntimePermissions,
  skills: RuntimeSkill[],
  options: { person: string | null }
) {
  return assemblePrompt(input, {
    activeSurface: activeSurface.state,
    person: options.person,
    promptedTools: getPromptedTools({
      executionType: toolExecutionType(input.type),
      permissions: permissions.all,
      toolModes: permissions.toolModes,
    }),
    skills,
  })
}

export function runtimeToolSnapshot(
  input: AgentRuntimeInput,
  activeSurface: LoadedActiveSurface,
  permissions: RuntimePermissions
) {
  return createRunToolSnapshot({
    activeSurfaceTools: visibleNativeToolSnapshots(activeSurface.tools),
    capabilities: permissions.capabilities,
    lifecycleTools: visibleNativeToolSnapshots(runLifecycleTools()),
    sandboxTools: visibleNativeToolSnapshots(heldSandboxTools(input)),
  })
}

export function buildRuntimeContext(args: {
  activeSurface: LoadedActiveSurface
  input: AgentRuntimeInput
  permissions: RuntimePermissions
  sandbox: LoadedSandbox
  session: LoadedSession
}): RuntimeContext {
  return {
    activeSurface: args.activeSurface.state,
    run: {
      id: args.input.run._id,
      rootId: args.input.run.rootId ?? null,
      sandboxId: args.sandbox?.externalId ?? null,
      status: args.input.run.status,
      organizationId: args.input.run.organizationId,
    },
    session:
      args.session === null
        ? null
        : {
            id: args.session._id,
          },
    tools: runtimeTools(args.input, args.activeSurface, args.permissions),
  }
}

export function runtimeTools(
  input: AgentRuntimeInput,
  activeSurface: LoadedActiveSurface,
  permissions: RuntimePermissions
): RuntimeTool[] {
  const tools = [
    ...runLifecycleTools(),
    ...activeSurface.tools,
    ...permissions.tools,
    ...heldSandboxTools(input),
  ]

  // Schema builders are runtime-neutral JSON but use a deliberately looser
  // `unknown` index signature. Keep the wire object unchanged at this boundary.
  return tools as RuntimeTool[]
}

/** Sandbox and agent tools never reach the broker: a call is looked up in
 *  this list, so leaving a tool out is what withholds it. */
function heldSandboxTools(input: AgentRuntimeInput) {
  return sandboxTools.filter((tool) =>
    holdsTool(input, { surface: "jori", tool: tool.name })
  )
}
