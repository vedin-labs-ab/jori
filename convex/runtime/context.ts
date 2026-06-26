import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Doc, type Id } from "../_generated/dataModel"
import { type ActionCtx, action, internalMutation } from "../_generated/server"
import { type AgentRuntimeInput } from "../runs/agent/input"
import { assemblePrompt } from "../runs/agent/prompt"
import { getPromptedTools, toolExecutionType } from "../runs/agent/tools/policy"
import { createRunToolSnapshot } from "../runs/agent/tools/snapshot"
import { toolSnapshot } from "../runs/schema"
import { type RuntimeSkill, runtimeSkillNames } from "../skills/runtime"
import { runLifecycleToolSnapshot } from "./lifecycle/snapshot"
import { runLifecycleTools } from "./lifecycle/tools"
import {
  type RuntimePermissions,
  runtimePermissions,
} from "./permissions/index"
import { sandboxToolSnapshot, sandboxTools } from "./sandbox"
import { syncSessionReactions } from "./sessions"
import { requireWorkerSecret } from "./shared"
import { loadActiveSurface } from "./surface"
import { activeSurfaceToolSnapshot } from "./surface/tools"
import { recordTrace } from "./traces"

export const load = action({
  args: {
    runId: v.id("runs"),
    secret: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<unknown> => {
    requireWorkerSecret(args.secret)

    const session = (await ctx.runQuery(internal.sessions.data.getByRun, {
      runId: args.runId,
    })) as LoadedSession

    if (session !== null) {
      await syncSessionReactions(ctx, session._id)
    }

    const [input, run] = (await Promise.all([
      ctx.runQuery(internal.runs.records.getInputByRun, { runId: args.runId }),
      ctx.runQuery(internal.runs.records.get, { runId: args.runId }),
    ])) as [
      AgentRuntimeInput | null,
      {
        _id: Id<"runs">
        status: "completed" | "failed" | "queued" | "running" | "stopped"
      } | null,
    ]
    if (input === null || run === null) {
      throw new Error("Runtime context not found.")
    }

    const skills = await loadRuntimeSkills(ctx, input.run.tenantId)
    const skillNames = runtimeSkillNames(skills)
    const [sandbox, permissions, activeSurface] = await Promise.all([
      loadSandboxReference(ctx, { runId: args.runId, status: run.status }),
      runtimePermissions(ctx, input, skillNames),
      loadActiveSurface(ctx, input, args.runId),
    ])
    const lifecycleTools = runLifecycleTools()
    const promptedTools = getPromptedTools({
      executionType: toolExecutionType(input.type),
      permissions: permissions.all,
      toolModes: permissions.toolModes,
    })
    const prompt = assemblePrompt(input, {
      activeSurface: activeSurface.state,
      promptedTools,
      skills,
    })

    await ctx.runMutation(internal.runtime.context.prepareRun, {
      runId: args.runId,
      tools: runtimeToolSnapshot(
        input,
        activeSurface,
        lifecycleTools,
        permissions
      ),
    })

    return runtimeResponse({
      activeSurface,
      input,
      lifecycleTools,
      permissions,
      prompt,
      run,
      sandbox,
      session,
    })
  },
})

export const reload = action({
  args: {
    runId: v.id("runs"),
    secret: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<unknown> => {
    requireWorkerSecret(args.secret)

    const session = (await ctx.runQuery(internal.sessions.data.getByRun, {
      runId: args.runId,
    })) as LoadedSession

    if (session !== null) {
      await syncSessionReactions(ctx, session._id)
    }

    const input = (await ctx.runQuery(internal.runs.records.getInputByRun, {
      runId: args.runId,
    })) as AgentRuntimeInput | null

    if (input === null) {
      throw new Error("Runtime context not found.")
    }

    const skills = await loadRuntimeSkills(ctx, input.run.tenantId)
    const permissions = await runtimePermissions(
      ctx,
      input,
      runtimeSkillNames(skills)
    )
    const activeSurface = await loadActiveSurface(ctx, input, args.runId)
    const lifecycleTools = runLifecycleTools()
    const promptedTools = getPromptedTools({
      executionType: toolExecutionType(input.type),
      permissions: permissions.all,
      toolModes: permissions.toolModes,
    })

    return {
      prompt: assemblePrompt(input, {
        activeSurface: activeSurface.state,
        promptedTools,
        skills,
      }),
      activeSurface: activeSurface.state,
      tools: runtimeTools(lifecycleTools, activeSurface, permissions),
    }
  },
})

type LoadedActiveSurface = Awaited<ReturnType<typeof loadActiveSurface>>
type LoadedRun = {
  _id: Id<"runs">
  status: "completed" | "failed" | "queued" | "running" | "stopped"
}

async function loadRuntimeSkills(ctx: ActionCtx, tenantId: string) {
  return (await ctx.runQuery(internal.skills.catalog.listForRuntime, {
    tenantId,
  })) as RuntimeSkill[]
}
type LoadedSandbox = { externalId: string } | null
type LoadedSession = { _id: Id<"sessions"> } | null

function runtimeToolSnapshot(
  input: AgentRuntimeInput,
  activeSurface: LoadedActiveSurface,
  lifecycleTools: ReturnType<typeof runLifecycleTools>,
  permissions: RuntimePermissions
) {
  return createRunToolSnapshot({
    activeSurfaceTools: activeSurfaceToolSnapshot(activeSurface.tools),
    capabilities: permissions.capabilities,
    lifecycleTools: runLifecycleToolSnapshot(lifecycleTools),
    sandboxTools: sandboxToolSnapshot(),
    webSearch: input.type !== "automation" || input.automation.access.web,
  })
}

function runtimeResponse(args: {
  activeSurface: LoadedActiveSurface
  input: AgentRuntimeInput
  lifecycleTools: ReturnType<typeof runLifecycleTools>
  permissions: RuntimePermissions
  prompt: string
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
    tools: runtimeTools(
      args.lifecycleTools,
      args.activeSurface,
      args.permissions
    ),
  }
}

function runtimeTools(
  lifecycleTools: ReturnType<typeof runLifecycleTools>,
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

async function loadSandboxReference(
  ctx: ActionCtx,
  args: {
    runId: Id<"runs">
    status: Doc<"runs">["status"]
  }
) {
  if (isTerminalStatus(args.status)) {
    return (await ctx.runQuery(internal.runtime.sandboxes.retainedByRun, {
      runId: args.runId,
    })) as { externalId: string } | null
  }

  return (await ctx.runMutation(internal.runtime.sandboxes.claimForRun, {
    runId: args.runId,
  })) as { externalId: string } | null
}

function isTerminalStatus(status: Doc<"runs">["status"]) {
  return status === "completed" || status === "failed" || status === "stopped"
}

export const prepareRun = internalMutation({
  args: {
    runId: v.id("runs"),
    tools: toolSnapshot,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId)

    if (run === null) {
      return null
    }

    await recordTrace(ctx, {
      run,
      key: `run:${args.runId}:prepared`,
      source: "convex.runtime",
      type: "run.prepared",
      data: {
        tools: args.tools,
      },
    })

    return null
  },
})
