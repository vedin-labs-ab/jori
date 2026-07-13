import { tasks } from "@trigger.dev/sdk"
import { cleanupTaskId, type RuntimeContext } from "../types"
import { type E2BSandboxRuntime } from "./e2b"

const idleSandboxCleanupTtl = "30m"

export async function releaseSandbox(args: {
  context: RuntimeContext
  sandbox: E2BSandboxRuntime
}) {
  try {
    const lease = await args.sandbox.release()

    if (lease === null) {
      await cleanupSandbox(args.sandbox)
      return
    }

    await tasks.trigger(
      cleanupTaskId,
      {
        expiresAt: lease.expiresAt,
        runId: args.context.run.id,
        sandboxId: lease.sandboxId,
      },
      {
        delay: new Date(lease.expiresAt),
        idempotencyKey: `sandbox:${lease.sandboxId}:expires:${lease.expiresAt}`,
        maxDuration: 300,
        ttl: idleSandboxCleanupTtl,
      }
    )
  } catch (error) {
    console.error("Failed to release sandbox.", error)
    await cleanupSandbox(args.sandbox)
  }
}

async function cleanupSandbox(sandbox: E2BSandboxRuntime) {
  try {
    await sandbox.cleanup()
  } catch (error) {
    console.error("Failed to clean up sandbox.", error)
  }
}
