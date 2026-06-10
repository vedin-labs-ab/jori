"use node"

import { internal } from "../_generated/api"
import { type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { runCodexInE2B } from "./sandbox/e2b"
import { hashExecutionToken } from "./tokens"
import { type RuntimeToolBundle } from "./tools"
import { CodexRunError, formatError } from "./trace"

type PromptedExecution = {
  id: Id<"executions">
  prompt: string
  toolBundle: RuntimeToolBundle
}

export async function runPromptedExecution(
  ctx: ActionCtx,
  args: {
    tenantId: string
    execution: PromptedExecution
    executionToken: string
  }
) {
  const hash = await hashExecutionToken(args.executionToken)
  let trace: string | undefined
  let executionError: string | undefined
  let status: "completed" | "failed" = "completed"

  try {
    const runtimeResult = await runCodexInE2B({
      authJsonBase64: requireCodexAuthJsonBase64(),
      onSandboxCreated: async (sandboxId) => {
        await ctx.runMutation(internal.runs.executions.markRunning, {
          executionId: args.execution.id,
          sandboxId,
          hash,
        })
      },
      prompt: args.execution.prompt,
      toolBundle: args.execution.toolBundle,
    })

    trace = runtimeResult.trace
  } catch (error) {
    status = "failed"
    executionError = formatError(error)
    trace = error instanceof CodexRunError ? error.trace : undefined
  }

  const fileId =
    trace === undefined
      ? undefined
      : await ctx.storage.store(
          new Blob([trace], {
            type: "application/x-ndjson",
          })
        )

  await ctx.runMutation(internal.runs.executions.finish, {
    tenantId: args.tenantId,
    executionId: args.execution.id,
    fileId,
    error: executionError,
    status,
  })
}

function requireCodexAuthJsonBase64() {
  const authJson = process.env.CODEX_AUTH_JSON_BASE64

  if (authJson === undefined) {
    throw new Error("Missing CODEX_AUTH_JSON_BASE64")
  }

  return authJson
}
