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
    tenantId: input.run.tenantId,
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
    runId: input.run._id,
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
    webSearch: shouldAllowWebSearch(input),
  }
}

function shouldAllowWebSearch(input: CodexRuntimeInput) {
  return input.type !== "automation" || input.automation.access.web
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
      tenantId: args.input.run.tenantId,
    }
  )
  const toolModes = resolveToolModes(permissionOverrides)

  return assembleToolsForRun({
    milo: {
      convexSiteUrl: args.convexSiteUrl,
      executionToken: args.executionToken,
    },
    integrations: args.input.integrations,
    access:
      args.input.type === "automation"
        ? args.input.automation.access
        : undefined,
    toolModes,
  })
}

async function createExecution(
  ctx: ActionCtx,
  args: {
    runId: Id<"runs">
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
      runId: args.runId,
      approvalId: args.approvalId,
      promptId,
    }
  )

  if (executionId === null) {
    await ctx.storage.delete(promptId)
  }

  return executionId
}
