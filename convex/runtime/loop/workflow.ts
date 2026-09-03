import {
  cleanup,
  type EventId,
  vWorkflowId,
  WorkflowManager,
} from "@convex-dev/workflow"
import { vResultValidator } from "@convex-dev/workpool"
import { v } from "convex/values"
import {
  isTerminalRunStatus,
  maxRunTurns,
} from "../../../contracts/runtime/runs"
import { components, internal } from "../../_generated/api"
import { internalMutation } from "../../_generated/server"
import { settleRunSandbox } from "../../runs/execution/sandboxes/data"
import { recordWorkerTrace } from "../../runs/execution/traces/data"
import { waiterWake } from "../../runs/execution/waiters/schema"

type AgentOutcome = "completed" | "failed" | "skipped" | "stopped"

const failedSequence = 999_999

export const workflow = new WorkflowManager(components.workflow, {
  workpoolOptions: {
    defaultRetryBehavior: {
      base: 2,
      initialBackoffMs: 1000,
      maxAttempts: 3,
    },
    maxParallelism: 32,
    retryActionsByDefault: false,
  },
})

/**
 * A run's whole life as one durable function. The handler owns control flow
 * and nothing else: every read, write, model call and sandbox call is a step,
 * and a wait is an event the run is parked on rather than a held process.
 */
export const agent = workflow
  .define({
    args: { runId: v.id("runs") },
    returns: v.union(
      v.literal("completed"),
      v.literal("failed"),
      v.literal("skipped"),
      v.literal("stopped")
    ),
  })
  .handler(async (step, args): Promise<AgentOutcome> => {
    const opened = await step.runAction(internal.runtime.loop.open.step, args, {
      retry: true,
    })

    if (opened === "skipped") {
      return "skipped"
    }

    for (let turn = 1; turn <= maxRunTurns; turn += 1) {
      await step.runAction(
        internal.runtime.loop.model.step,
        { runId: args.runId, turn },
        { retry: true }
      )

      let outcome = await step.runAction(
        internal.runtime.loop.act.step,
        { runId: args.runId, turn },
        { retry: true }
      )

      while (outcome.status === "parked") {
        const wake = await step.awaitEvent({
          id: outcome.eventId as EventId<"wake">,
          validator: waiterWake,
        })

        outcome = await step.runAction(
          internal.runtime.loop.act.step,
          { runId: args.runId, turn, wake },
          { retry: true }
        )
      }

      if (outcome.status !== "continue") {
        return outcome.status
      }
    }

    // The last act step already recorded the failure.
    return "failed"
  })

/**
 * The run's end, whatever brought it there. A workflow that failed outright
 * never got to record why, so this does; then the sandbox is settled and the
 * workflow's own storage released.
 */
export const complete = internalMutation({
  args: {
    workflowId: vWorkflowId,
    result: vResultValidator,
    context: v.object({ runId: v.id("runs") }),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.context.runId)

    if (run === null) {
      return null
    }

    if (args.result.kind === "failed" && !isTerminalRunStatus(run.status)) {
      await recordWorkerTrace(ctx, {
        data: { error: args.result.error },
        key: `${run._id}:${failedSequence}:run.failed`,
        runId: run._id,
        sequence: failedSequence,
        type: "run.failed",
      })
    }

    const settled = await ctx.db.get(run._id)

    if (settled !== null) {
      await settleRunSandbox(ctx, settled)
    }

    await cleanup(ctx, components.workflow, args.workflowId)
    await ctx.db.patch(run._id, { workflowId: undefined })

    return null
  },
})
