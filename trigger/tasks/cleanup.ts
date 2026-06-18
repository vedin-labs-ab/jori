import { task } from "@trigger.dev/sdk/v3"
import { MiloConvexClient } from "../convex"
import { killE2BSandbox } from "../sandbox/e2b"
import { cleanupTaskId, type SandboxCleanupPayload } from "../types"

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
    await killE2BSandbox({
      convex: new MiloConvexClient(),
      executionId: payload.executionId,
      sandboxId: payload.sandboxId,
    })

    return {
      sandboxId: payload.sandboxId,
      status: "cleaned",
    }
  },
})
