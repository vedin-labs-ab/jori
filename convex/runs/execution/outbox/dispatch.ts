import { v } from "convex/values"
import { agentTaskId, cleanupTaskId } from "../../../../contracts/runtime"
import {
  type AgentRunPayload,
  type SandboxCleanupPayload,
  type WaiterWake,
} from "../../../../contracts/runtime/worker"
import { internal } from "../../../_generated/api"
import { type Doc } from "../../../_generated/dataModel"
import { type ActionCtx, internalAction } from "../../../_generated/server"
import { sha256Hex } from "../../../shared/crypto"
import { isTerminalRunStatus } from "../../schema"
import { formatRuntimeError } from "./error"

const batchSize = 5
const maxAgentDurationSeconds = 60 * 60 * 2
// Wire format of the trigger.dev REST API called below (endpoints, payload
// packaging, idempotency key hashing) mirrors @trigger.dev/sdk@4.4.6; this
// action calls it directly so dispatch stays on the fast V8 runtime.
const triggerApiVersion = "2025-07-16"

export const drain = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    for (let index = 0; index < batchSize; index += 1) {
      const item = (await ctx.runMutation(
        internal.runs.execution.outbox.records.claimNext,
        {
          now: Date.now(),
        }
      )) as Doc<"outbox"> | null

      if (item === null) {
        return null
      }

      try {
        const receiptId = await performOperation(ctx, item)
        await ctx.runMutation(internal.runs.execution.outbox.records.markSent, {
          outboxId: item._id,
          receiptId,
        })
      } catch (error) {
        await ctx.runMutation(
          internal.runs.execution.outbox.records.markFailed,
          {
            outboxId: item._id,
            error: formatRuntimeError(error),
          }
        )
      }
    }

    await ctx.scheduler.runAfter(
      0,
      internal.runs.execution.outbox.dispatch.drain,
      {}
    )

    return null
  },
})

type DispatchCtx = ActionCtx

async function performOperation(ctx: DispatchCtx, item: Doc<"outbox">) {
  const operation = item.operation

  switch (operation.type) {
    case "run.start":
      return await triggerAgentRun(ctx, item)
    case "waiter.wake":
      return await wakeWaiter(ctx, operation)
    case "run.cancel":
      return await cancelRun(ctx, item)
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

  if (run === null || isTerminalRunStatus(run.status)) {
    return undefined
  }

  const handle = await triggerTask(agentTaskId, {
    payload: { runId: operation.runId } satisfies AgentRunPayload,
    idempotencyKey: item.key,
    tags: runtimeTags(item),
    ttl: "14d",
  })

  return handle.id
}

async function wakeWaiter(
  ctx: DispatchCtx,
  operation: Extract<Doc<"outbox">["operation"], { type: "waiter.wake" }>
) {
  const waiter = (await ctx.runQuery(
    internal.runs.execution.waiters.records.get,
    {
      waiterId: operation.waiterId,
    }
  )) as Doc<"waiters"> | null

  if (waiter === null) {
    return undefined
  }

  const wake = {
    reason: operation.reason,
    ...(operation.subject === undefined ? {} : { subject: operation.subject }),
  } satisfies WaiterWake

  await callTriggerApi(
    `/api/v1/waitpoints/tokens/${waiter.waitpointId}/complete`,
    {
      data: wake,
    }
  )

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
    internal.runs.execution.sandboxes.records.retainedByRun,
    {
      runId: operation.runId,
    }
  )) as Doc<"sandboxes"> | null

  if (run?.workerId === undefined && sandbox === null) {
    return undefined
  }

  if (run?.workerId !== undefined) {
    await callTriggerApi(`/api/v2/runs/${run.workerId}/cancel`)
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

  await triggerTask(cleanupTaskId, {
    payload: {
      runId: operation.runId,
      sandboxId,
    } satisfies SandboxCleanupPayload,
    idempotencyKey: `${item.key}:sandbox:${sandboxId}`,
    tags: runtimeTags(item),
    ttl: "1h",
    maxDurationSeconds: 300,
  })
}

async function triggerTask(
  taskId: string,
  args: {
    payload: Record<string, unknown>
    idempotencyKey: string
    tags: string[]
    ttl: string
    maxDurationSeconds?: number
  }
) {
  return (await callTriggerApi(
    `/api/v1/tasks/${encodeURIComponent(taskId)}/trigger`,
    {
      // The SDK superjson-encodes object payloads; for plain JSON values
      // that framing is exactly {"json": <value>}.
      payload: JSON.stringify({ json: args.payload }),
      options: {
        payloadType: "application/super+json",
        idempotencyKey: await sha256Hex(args.idempotencyKey),
        idempotencyKeyOptions: { key: args.idempotencyKey, scope: "run" },
        tags: args.tags,
        ttl: args.ttl,
        maxDuration: args.maxDurationSeconds ?? maxAgentDurationSeconds,
      },
    }
  )) as { id: string }
}

async function callTriggerApi(path: string, body?: Record<string, unknown>) {
  const baseUrl = process.env.TRIGGER_API_URL ?? "https://api.trigger.dev"
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireTriggerSecretKey()}`,
      "Content-Type": "application/json",
      "x-trigger-api-version": triggerApiVersion,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })

  if (!response.ok) {
    throw new Error(
      `Trigger API ${path} failed (${response.status}): ${await response.text()}`
    )
  }

  return (await response.json()) as unknown
}

function runtimeTags(item: Doc<"outbox">) {
  return [`tenant:${shortTag(item.tenantId)}`, `outbox:${shortTag(item._id)}`]
}

function shortTag(value: string) {
  return value.length <= 56 ? value : value.slice(0, 56)
}

function requireTriggerSecretKey() {
  const secretKey = process.env.TRIGGER_DEV_API_KEY?.trim()

  if (secretKey === undefined || secretKey === "") {
    throw new Error("Missing TRIGGER_DEV_API_KEY")
  }

  return secretKey
}
