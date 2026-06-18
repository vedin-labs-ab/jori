"use node"

import { configure, runs, tasks, wait } from "@trigger.dev/sdk"
import { v } from "convex/values"
import { agentTaskId, cleanupTaskId } from "../../contracts/runtime"
import { internal } from "../_generated/api"
import { type Doc } from "../_generated/dataModel"
import { type ActionCtx, internalAction } from "../_generated/server"
import { formatRuntimeError } from "./shared"

const batchSize = 5
const maxAgentDurationSeconds = 60 * 60 * 2

export const drain = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    configureTrigger()

    for (let index = 0; index < batchSize; index += 1) {
      const item = (await ctx.runMutation(internal.runtime.outbox.claimNext, {
        now: Date.now(),
      })) as Doc<"outbox"> | null

      if (item === null) {
        return null
      }

      try {
        const externalId = await performOperation(ctx, item)
        await ctx.runMutation(internal.runtime.outbox.markSent, {
          outboxId: item._id,
          externalId,
        })
      } catch (error) {
        await ctx.runMutation(internal.runtime.outbox.markFailed, {
          outboxId: item._id,
          error: formatRuntimeError(error),
        })
      }
    }

    await ctx.scheduler.runAfter(0, internal.runtime.dispatch.drain, {})

    return null
  },
})

type DispatchCtx = ActionCtx

async function performOperation(ctx: DispatchCtx, item: Doc<"outbox">) {
  const operation = item.operation

  switch (operation.type) {
    case "enqueueRun":
      return await triggerAgentRun(ctx, item)
    case "resumeApproval":
      await wait.completeToken(operation.waitpointTokenId, {
        approvalId: operation.approvalId,
        decision: operation.decision,
      })

      return undefined
    case "cancelRun":
      if (operation.triggerRunId !== undefined) {
        await runs.cancel(operation.triggerRunId)
      }

      if (operation.sandboxId !== undefined) {
        await triggerSandboxCleanup(item)
      }

      return undefined
  }
}

async function triggerAgentRun(ctx: DispatchCtx, item: Doc<"outbox">) {
  const operation = item.operation

  if (operation.type !== "enqueueRun") {
    return undefined
  }

  const execution = (await ctx.runQuery(internal.executions.records.get, {
    executionId: operation.executionId,
  })) as Doc<"executions"> | null

  if (execution === null || isTerminalExecution(execution)) {
    return undefined
  }

  const handle = await tasks.trigger(
    agentTaskId,
    {
      executionId: operation.executionId,
      runId: operation.runId,
      ...(operation.parentRunId === undefined
        ? {}
        : { parentRunId: operation.parentRunId }),
      ...(operation.rootRunId === undefined
        ? {}
        : { rootRunId: operation.rootRunId }),
    },
    {
      idempotencyKey: item.idempotencyKey,
      maxDuration: maxAgentDurationSeconds,
      tags: runtimeTags(item),
      ttl: "14d",
    }
  )

  return handle.id
}

function isTerminalExecution(execution: Doc<"executions">) {
  return (
    execution.status === "completed" ||
    execution.status === "failed" ||
    execution.status === "stopped"
  )
}

async function triggerSandboxCleanup(item: Doc<"outbox">) {
  const operation = item.operation

  if (operation.type !== "cancelRun" || operation.sandboxId === undefined) {
    return
  }

  await tasks.trigger(
    cleanupTaskId,
    {
      executionId: operation.executionId,
      runId: operation.runId,
      sandboxId: operation.sandboxId,
    },
    {
      idempotencyKey: `${item.idempotencyKey}:sandbox:${operation.sandboxId}`,
      maxDuration: 300,
      tags: runtimeTags(item),
      ttl: "1h",
    }
  )
}

function runtimeTags(item: Doc<"outbox">) {
  return [`tenant:${shortTag(item.tenantId)}`, `outbox:${shortTag(item._id)}`]
}

function shortTag(value: string) {
  return value.length <= 56 ? value : value.slice(0, 56)
}

function configureTrigger() {
  const secretKey = process.env.TRIGGER_DEV_API_KEY?.trim()

  if (secretKey === undefined || secretKey === "") {
    throw new Error("Missing TRIGGER_DEV_API_KEY")
  }

  configure({ secretKey })
}
