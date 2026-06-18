"use node"

import { internal } from "../../../_generated/api"
import { type Id } from "../../../_generated/dataModel"
import { type ActionCtx } from "../../../_generated/server"
import { createExecutionToken, hashExecutionToken } from "../tokens"
import { type RuntimeToolBundle } from "../tools"
import { runCodexInE2B } from "./e2b"
import { CodexRunError, formatError } from "./trace"

type PromptedExecution = {
  id: Id<"executions">
  runId: Id<"runs">
  prompt: string
  toolBundle: RuntimeToolBundle
  webSearch: boolean
}

export async function runPromptedExecution(
  ctx: ActionCtx,
  args: {
    agentId?: string
    execution: PromptedExecution
    executionToken: string
  }
) {
  const hash = await hashExecutionToken(args.executionToken)
  const traceToken = createExecutionToken()
  let trace: string | undefined
  let executionError: string | undefined
  let status: "completed" | "failed" = "completed"

  try {
    const runtimeResult = await runCodexInE2B({
      agentId: args.agentId,
      authJsonBase64: requireCodexAuthJsonBase64(),
      onSandboxCreated: async (sandbox) => {
        const isRunning: boolean = await ctx.runMutation(
          internal.executions.records.markRunning,
          {
            executionId: args.execution.id,
            sandboxId: sandbox.sandboxId,
            trace: {
              host: sandbox.traceHost,
              token: traceToken,
            },
            hash,
          }
        )

        if (!isRunning) {
          throw new Error("Execution was stopped before the sandbox started.")
        }
      },
      prompt: args.execution.prompt,
      toolBundle: args.execution.toolBundle,
      traceToken,
      webSearch: args.execution.webSearch,
    })

    trace = runtimeResult.trace
  } catch (error) {
    status = "failed"
    executionError = formatError(error)
    trace = error instanceof CodexRunError ? error.trace : undefined
  }

  const traceResult = await storeTrace(ctx, trace)

  if (traceResult.error !== undefined) {
    status = "failed"
    executionError = joinExecutionErrors(executionError, traceResult.error)
  }

  await finishExecution(ctx, {
    executionId: args.execution.id,
    fileId: traceResult.fileId,
    error: executionError,
    status,
  })
}

async function storeTrace(ctx: ActionCtx, trace: string | undefined) {
  if (trace === undefined) {
    return {}
  }

  try {
    return {
      fileId: await ctx.storage.store(
        new Blob([trace], {
          type: "application/x-ndjson",
        })
      ),
    }
  } catch (error) {
    return { error: `Failed to store execution trace: ${formatError(error)}` }
  }
}

async function finishExecution(
  ctx: ActionCtx,
  args: {
    executionId: Id<"executions">
    fileId?: Id<"_storage">
    error?: string
    status: "completed" | "failed"
  }
) {
  let lastError: unknown

  for (const delayMs of [0, 250, 1000]) {
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }

    try {
      await ctx.runMutation(internal.executions.records.finish, args)

      return
    } catch (error) {
      lastError = error
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Failed to finish execution.")
}

function joinExecutionErrors(
  current: string | undefined,
  next: string | undefined
) {
  return [current, next].filter(Boolean).join("\n\n") || undefined
}

function requireCodexAuthJsonBase64() {
  const authJson = process.env.CODEX_AUTH_JSON_BASE64

  if (authJson === undefined) {
    throw new Error("Missing CODEX_AUTH_JSON_BASE64")
  }

  return authJson
}
