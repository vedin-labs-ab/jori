import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { resolveToolModes } from "../permissions/catalog"
import { filterRuntimeSkillsForBundle } from "./bundles"
import { type CodexRuntimeInput } from "./codex"
import { type ApprovalContinuation } from "./continuation"
import { assemblePrompt } from "./prompt"
import { createSkillSandboxFiles } from "./skills"
import { assembleToolsForRun } from "./tools"

export async function createPromptedExecution(
  ctx: ActionCtx,
  args: {
    input: CodexRuntimeInput
    executionToken: string
    convexSiteUrl: string
    approvalId?: Id<"approvals">
    continuation?: ApprovalContinuation
  }
) {
  const input = args.input
  const skills = await ctx.runQuery(internal.skills.catalog.listForRuntime, {
    tenantId: input.trigger.tenantId,
  })
  const toolBundle = await assembleRuntimeTools(ctx, args)
  const runtimeSkills = filterRuntimeSkillsForBundle(
    skills,
    toolBundle.skillNames
  )
  const runtimeToolBundle = {
    ...toolBundle,
    sandboxFiles: [
      ...toolBundle.sandboxFiles,
      ...createSkillSandboxFiles(runtimeSkills),
    ],
  }
  const prompt = assemblePrompt(
    input,
    runtimeToolBundle.promptedTools,
    args.continuation
  )
  const executionId = await createExecution(ctx, {
    triggerId: input.trigger._id,
    approvalId: args.approvalId,
    prompt,
  })

  if (executionId === null) {
    return null
  }

  return {
    id: executionId,
    prompt,
    toolBundle: runtimeToolBundle,
  }
}

async function assembleRuntimeTools(
  ctx: ActionCtx,
  args: {
    input: CodexRuntimeInput
    executionToken: string
    convexSiteUrl: string
  }
) {
  const permissionOverrides = await ctx.runQuery(
    internal.permissions.tools.listForRuntime,
    {
      tenantId: args.input.trigger.tenantId,
    }
  )
  const toolModes = resolveToolModes(permissionOverrides)

  return assembleToolsForRun({
    milo: {
      convexSiteUrl: args.convexSiteUrl,
      executionToken: args.executionToken,
    },
    integrations: args.input.integrations,
    scheduleOutput:
      args.input.type === "scheduled" ? args.input.schedule.output : undefined,
    toolModes,
  })
}

async function createExecution(
  ctx: ActionCtx,
  args: {
    triggerId: Id<"triggers">
    approvalId?: Id<"approvals">
    prompt: string
  }
) {
  const promptId = await ctx.storage.store(
    new Blob([args.prompt], {
      type: "text/markdown",
    })
  )

  const executionId = await ctx.runMutation(
    internal.executions.records.create,
    {
      triggerId: args.triggerId,
      approvalId: args.approvalId,
      promptId,
    }
  )

  if (executionId === null) {
    await ctx.storage.delete(promptId)
  }

  return executionId
}
