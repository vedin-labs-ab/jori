import { task } from "@trigger.dev/sdk"
import { agentTaskId } from "../../contracts/runtime/tasks"
import {
  type AgentRunPayload,
  isTerminalAgentRunStatus,
  type RuntimeContext,
} from "../../contracts/runtime/worker"
import { JoriConvexClient } from "../convex"
import { OpenRouterModelRuntime } from "../model/openrouter"
import { runAgentLoop } from "../runs/loop"
import { E2BSandboxRuntime } from "../sandbox/e2b"
import { releaseSandbox } from "../sandbox/release"
import { errorDetails } from "../trace/events"
import { recordRuntimeEvent } from "../trace/runtime"

const maxAttempts = 3

export const joriAgentRun = task({
  id: agentTaskId,
  retry: {
    factor: 2,
    maxAttempts,
    maxTimeoutInMs: 60_000,
    minTimeoutInMs: 1_000,
    randomize: true,
  },
  run: async (payload: AgentRunPayload, { ctx }) => {
    const platform = new JoriConvexClient()
    const attempt = ctx.attempt.number
    // Loading the run also records the started trace, flips the run to
    // running, and drains the first session batch, so the loop starts with
    // no further round trips.
    const context = await platform.loadRun(payload, attempt)
    const sandbox = new E2BSandboxRuntime(
      platform,
      context.run.id,
      context.run.sandboxId
    )

    if (isTerminalAgentRunStatus(context.run.status)) {
      await sandbox.cleanup()

      return {
        status: "skipped",
      }
    }

    try {
      const output = await runAgentLoop({
        attempt,
        model: new OpenRouterModelRuntime(),
        runtime: { context, platform, sandbox },
      })
      await releaseSandbox({ context, sandbox })

      return output
    } catch (error) {
      await handleFailure({ attempt, context, error, platform, sandbox })
      throw error
    }
  },
})

async function handleFailure(args: {
  attempt: number
  context: RuntimeContext
  platform: JoriConvexClient
  error: unknown
  sandbox: E2BSandboxRuntime
}) {
  if (args.attempt < maxAttempts) {
    return
  }

  await recordRuntimeEvent(args.platform, args.context, {
    attempt: args.attempt,
    data: errorDetails(args.error),
    sequence: 999_999,
    type: "run.failed",
  })
  await args.sandbox.cleanup()
}
