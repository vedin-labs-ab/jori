import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { resolveToolModes } from "../permissions/catalog"
import { filterRuntimeSkillsForBundle } from "./bundles"
import { type CodexRuntimeInput } from "./codex"
import { assemblePrompt, type RuntimeSkill } from "./prompt"
import { assembleToolsForRun } from "./tools"

export async function createPromptedExecution(
  ctx: ActionCtx,
  args: {
    input: CodexRuntimeInput
    executionToken: string
    convexSiteUrl: string
  }
) {
  const input = args.input
  const skills = await ctx.runQuery(internal.skills.catalog.listForRuntime, {
    tenantId: input.trigger.tenantId,
  })
  const toolBundle = await assembleRuntimeTools(ctx, args)
  const promptBundle = assembleRuntimePrompt(input, skills, toolBundle)
  const executionId = await createExecution(ctx, {
    triggerId: input.trigger._id,
    prompt: promptBundle.rendered,
  })

  if (executionId === null) {
    return null
  }

  return {
    id: executionId,
    prompt: promptBundle.rendered,
    toolBundle,
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
    toolModes,
  })
}

function assembleRuntimePrompt(
  input: CodexRuntimeInput,
  skills: RuntimeSkill[],
  toolBundle: ReturnType<typeof assembleToolsForRun>
) {
  return assemblePrompt(
    input,
    filterRuntimeSkillsForBundle(skills, toolBundle.skillNames),
    toolBundle.promptedTools,
    toolBundle.capabilities
  )
}

async function createExecution(
  ctx: ActionCtx,
  args: {
    triggerId: Id<"triggers">
    prompt: string
  }
) {
  const promptId = await ctx.storage.store(
    new Blob([args.prompt], {
      type: "text/markdown",
    })
  )

  const executionId = await ctx.runMutation(internal.runs.executions.create, {
    triggerId: args.triggerId,
    promptId,
  })

  if (executionId === null) {
    await ctx.storage.delete(promptId)
  }

  return executionId
}
