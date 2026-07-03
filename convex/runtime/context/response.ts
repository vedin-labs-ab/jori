import { type RuntimePrompt } from "../../../contracts/runtime"
import { type AgentRuntimeInput } from "../../runs/agent/input"
import { assemblePrompt } from "../../runs/agent/prompt"
import {
  getPromptedTools,
  toolExecutionType,
} from "../../runs/agent/tools/policy"
import { createRunToolSnapshot } from "../../runs/agent/tools/snapshot"
import { type RuntimeSkill } from "../../skills/runtime"
import { type runLifecycleTools } from "../lifecycle"
import { type RuntimePermissions } from "../permissions/index"
import { visibleNativeToolSnapshots } from "../permissions/native"
import { sandboxTools } from "../sandbox"
import { type loadActiveSurface } from "../surface"
import {
  type LoadedRun,
  type LoadedSandbox,
  type LoadedSession,
} from "./loaders"

export type LoadedActiveSurface = Awaited<ReturnType<typeof loadActiveSurface>>

type LifecycleTools = ReturnType<typeof runLifecycleTools>

export function buildRuntimePrompt(
  input: AgentRuntimeInput,
  activeSurface: LoadedActiveSurface,
  permissions: RuntimePermissions,
  skills: RuntimeSkill[]
) {
  return assemblePrompt(input, {
    activeSurface: activeSurface.state,
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
  lifecycleTools: LifecycleTools,
  permissions: RuntimePermissions
) {
  return createRunToolSnapshot({
    activeSurfaceTools: visibleNativeToolSnapshots(activeSurface.tools),
    capabilities: permissions.capabilities,
    lifecycleTools: visibleNativeToolSnapshots(lifecycleTools),
    sandboxTools: visibleNativeToolSnapshots(sandboxTools),
    webSearch: input.type !== "automation" || input.automation.access.web,
  })
}

export function runtimeResponse(args: {
  activeSurface: LoadedActiveSurface
  drained: unknown
  handoffs: unknown
  input: AgentRuntimeInput
  lifecycleTools: LifecycleTools
  permissions: RuntimePermissions
  prompt: RuntimePrompt
  run: LoadedRun
  sandbox: LoadedSandbox
  session: LoadedSession
}) {
  return {
    prompt: args.prompt,
    run: {
      id: args.input.run._id,
      rootId: args.input.run.rootId ?? null,
      sandboxId: args.sandbox?.externalId ?? null,
      status: args.run.status,
      tenantId: args.input.run.tenantId,
    },
    session:
      args.session === null
        ? null
        : {
            id: args.session._id,
          },
    activeSurface: args.activeSurface.state,
    drained: args.drained ?? null,
    handoffs: args.handoffs,
    tools: runtimeTools(
      args.lifecycleTools,
      args.activeSurface,
      args.permissions
    ),
  }
}

export function runtimeTools(
  lifecycleTools: LifecycleTools,
  activeSurface: LoadedActiveSurface,
  permissions: RuntimePermissions
) {
  return [
    ...lifecycleTools,
    ...activeSurface.tools,
    ...permissions.tools,
    ...sandboxTools,
  ]
}
