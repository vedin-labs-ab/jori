import { task } from "@trigger.dev/sdk/v3"
import { MiloConvexClient } from "../convex"
import { errorDetails } from "../events"
import { OpenRouterModelRuntime } from "../model/openrouter"
import { recordRuntimeEvent } from "../runs/events"
import { runAgentLoop } from "../runs/loop"
import { releaseSandbox } from "../runs/sandbox"
import { E2BSandboxRuntime } from "../sandbox/e2b"
import {
  type AgentRunPayload,
  agentTaskId,
  type RuntimeContext,
} from "../types"

const maxAttempts = 3

export const miloAgentRun = task({
  id: agentTaskId,
  retry: {
    factor: 2,
    maxAttempts,
    maxTimeoutInMs: 60_000,
    minTimeoutInMs: 1_000,
    randomize: true,
  },
  run: async (payload: AgentRunPayload, { ctx }) => {
    const convex = new MiloConvexClient()
    const attempt = ctx.attempt.number
    // Loading the run also records the started trace, flips the run to
    // running, and drains the first session batch, so the loop starts with
    // no further round trips.
    const context = await convex.loadRun(payload, attempt)
    const sandbox = new E2BSandboxRuntime(
      convex,
      context.run.id,
      context.run.sandboxId
    )

    if (isTerminalStatus(context.run.status)) {
      await sandbox.cleanup()

      return {
        status: "skipped",
      }
    }

    try {
      const output = await runAgentLoop({
        attempt,
        model: new OpenRouterModelRuntime(),
        runtime: { convex, context, sandbox },
      })
      await releaseSandbox({ context, sandbox })

      return output
    } catch (error) {
      await handleFailure({ attempt, context, convex, error, sandbox })
      throw error
    }
  },
})

function isTerminalStatus(status: RuntimeContext["run"]["status"]) {
  return status === "completed" || status === "failed" || status === "stopped"
}

async function handleFailure(args: {
  attempt: number
  context: RuntimeContext
  convex: MiloConvexClient
  error: unknown
  sandbox: E2BSandboxRuntime
}) {
  if (args.attempt < maxAttempts) {
    return
  }

  await recordRuntimeEvent(args.convex, args.context, {
    attempt: args.attempt,
    data: errorDetails(args.error),
    sequence: 999_999,
    type: "run.failed",
  })
  await args.sandbox.cleanup()
}
