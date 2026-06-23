import { task } from "@trigger.dev/sdk/v3"
import { MiloConvexClient } from "../convex"
import { errorDetails } from "../events"
import { createModelRuntime } from "../model/runtime"
import { E2BSandboxRuntime } from "../sandbox/e2b"
import {
  type AgentRunPayload,
  agentTaskId,
  type RuntimeContext,
} from "../types"
import { recordRunEvent } from "./events"
import { runAgentLoop } from "./loop"
import { releaseSandbox } from "./sandbox"

const maxAttempts = 3

export const miloAgentRun = task({
  id: agentTaskId,
  maxDuration: 7200,
  retry: {
    factor: 2,
    maxAttempts,
    maxTimeoutInMs: 60_000,
    minTimeoutInMs: 1_000,
    randomize: true,
  },
  run: async (payload: AgentRunPayload, { ctx }) => {
    const convex = new MiloConvexClient()
    const context = await convex.loadRun(payload)
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

    const attempt = ctx.attempt.number

    await recordRunEvent(convex, context, "run.started", 0, attempt)

    try {
      const output = await runAgentLoop({
        attempt,
        model: createModelRuntime(),
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

  await recordRunEvent(
    args.convex,
    args.context,
    "run.failed",
    999_999,
    args.attempt,
    errorDetails(args.error)
  )
  await args.sandbox.cleanup()
}
