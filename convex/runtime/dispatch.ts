"use node"

import { configure, runs, tasks, wait } from "@trigger.dev/sdk"
import { v } from "convex/values"
import { agentTaskId, cleanupTaskId } from "../../contracts/runtime"
import { internal } from "../_generated/api"
import { type Doc } from "../_generated/dataModel"
import { type ActionCtx, internalAction } from "../_generated/server"
import { sendOutboxReply } from "./replies/delivery"
import { formatRuntimeError } from "./shared"

const batchSize = 5
const maxAgentDurationSeconds = 60 * 60 * 2

export const drain = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    for (let index = 0; index < batchSize; index += 1) {
      const item = (await ctx.runMutation(internal.runtime.outbox.claimNext, {
        now: Date.now(),
      })) as Doc<"outbox"> | null

      if (item === null) {
        return null
      }

      try {
        const receiptId = await performOperation(ctx, item)
        await ctx.runMutation(internal.runtime.outbox.markSent, {
          outboxId: item._id,
          receiptId,
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
    case "run.start":
      return await triggerAgentRun(ctx, item)
    case "approval.resume":
      return await resumeApproval(ctx, operation)
    case "run.cancel":
      return await cancelRun(ctx, item)
    case "reply.send":
      return await sendOutboxReply(ctx, item)
  }
}

async function triggerAgentRun(ctx: DispatchCtx, item: Doc<"outbox">) {
  const operation = item.operation

  if (operation.type !== "run.start") {
    return undefined
  }

  const run = (await ctx.runQuery(internal.runs.records.get, {
    runId: operation.runId,
  })) as Doc<"runs"> | null

  if (run === null || isTerminalRun(run)) {
    return undefined
  }

  configureTrigger()

  const handle = await tasks.trigger(
    agentTaskId,
    {
      runId: operation.runId,
    },
    {
      idempotencyKey: item.key,
      maxDuration: maxAgentDurationSeconds,
      tags: runtimeTags(item),
      ttl: "14d",
    }
  )

  return handle.id
}

function isTerminalRun(run: Doc<"runs">) {
  return (
    run.status === "completed" ||
    run.status === "failed" ||
    run.status === "stopped"
  )
}

async function resumeApproval(
  ctx: DispatchCtx,
  operation: Extract<Doc<"outbox">["operation"], { type: "approval.resume" }>
) {
  const approval = (await ctx.runQuery(internal.approvals.approvals.get, {
    approvalId: operation.approvalId,
  })) as Doc<"approvals"> | null

  if (approval?.waitpointTokenId === undefined) {
    return undefined
  }

  configureTrigger()

  await wait.completeToken(approval.waitpointTokenId, {
    approvalId: operation.approvalId,
    decision: operation.decision,
  })

  return undefined
}

async function cancelRun(ctx: DispatchCtx, item: Doc<"outbox">) {
  const operation = item.operation

  if (operation.type !== "run.cancel") {
    return undefined
  }

  const run = (await ctx.runQuery(internal.runs.records.get, {
    runId: operation.runId,
  })) as Doc<"runs"> | null

  const sandbox = (await ctx.runQuery(
    internal.runtime.sandboxes.retainedByRun,
    {
      runId: operation.runId,
    }
  )) as Doc<"sandboxes"> | null

  if (run?.workerId === undefined && sandbox === null) {
    return undefined
  }

  configureTrigger()

  if (run?.workerId !== undefined) {
    await runs.cancel(run.workerId)
  }

  if (sandbox !== null) {
    await triggerSandboxCleanup(item, sandbox.externalId)
  }

  return undefined
}

async function triggerSandboxCleanup(item: Doc<"outbox">, sandboxId: string) {
  const operation = item.operation

  if (operation.type !== "run.cancel") {
    return
  }

  await tasks.trigger(
    cleanupTaskId,
    {
      runId: operation.runId,
      sandboxId,
    },
    {
      idempotencyKey: `${item.key}:sandbox:${sandboxId}`,
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
