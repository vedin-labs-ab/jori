import { task } from "@trigger.dev/sdk"
import { cleanupTaskId } from "../../contracts/runtime/tasks"
import { type SandboxCleanupPayload } from "../../contracts/runtime/worker"
import { MiloConvexClient } from "../convex"
import { killE2BSandbox } from "../sandbox/e2b/support"

export const miloSandboxCleanup = task({
  id: cleanupTaskId,
  maxDuration: 600,
  retry: {
    factor: 2,
    maxAttempts: 3,
    maxTimeoutInMs: 60_000,
    minTimeoutInMs: 1_000,
    randomize: true,
  },
  run: async (payload: SandboxCleanupPayload) => {
    const convex = new MiloConvexClient()

    if (payload.expiresAt !== undefined) {
      const reserved = await convex.reserveExpiredSandboxCleanup({
        expiresAt: payload.expiresAt,
        externalId: payload.sandboxId,
        runId: payload.runId,
      })

      if (!reserved) {
        return {
          sandboxId: payload.sandboxId,
          status: "skipped",
        }
      }
    }

    await killE2BSandbox({
      convex,
      sandboxId: payload.sandboxId,
    })

    return {
      sandboxId: payload.sandboxId,
      status: "cleaned",
    }
  },
})
