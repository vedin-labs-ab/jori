import { type WaiterWake } from "../../../contracts/runtime/waiters"
import { isParked, park, recordResumed } from "../loop/park"
import { type AgentRuntime } from "../platform/types"
import {
  bashTimeoutMs,
  executeCodingTool,
  finishBash,
  isParkedCommand,
} from "../sandbox/coding"
import { type SandboxCommandHandle } from "../sandbox/types"

/**
 * The sandbox-route tools. Everything but a shell command answers within the
 * step; a command that outlives its grace window parks the run on its pid and
 * is collected when the sandbox calls back or the wait expires.
 */
export async function executeSandboxTool(
  runtime: AgentRuntime,
  args: {
    input: unknown
    name: string
    onParked: () => Promise<void>
    wake?: WaiterWake
  }
) {
  if (args.wake !== undefined) {
    return await resumeCommand(runtime, args.wake)
  }

  const outcome = await executeCodingTool({
    input: args.input,
    sandbox: runtime.sandbox,
    tool: args.name,
  })

  if (!isParkedCommand(outcome)) {
    return outcome
  }

  const parked = await park(runtime, {
    condition: { kind: "command", pid: outcome.parked.pid },
    deadline: Date.now() + bashTimeoutMs(args.input),
    onParked: args.onParked,
    // A running command cannot be re-checked cheaply: its own callback and
    // the expiry timer are what end this wait.
    resolved: async () => await Promise.resolve(false),
    token: outcome.parked.token,
  })

  return isParked(parked)
    ? parked
    : await finishBash(runtime.sandbox, outcome.parked, { kill: false })
}

async function resumeCommand(runtime: AgentRuntime, wake: WaiterWake) {
  await recordResumed(runtime, wake)

  return await finishBash(runtime.sandbox, await commandHandle(runtime, wake), {
    kill: wake.reason === "expired",
  })
}

/** The waiter is where the parked command's pid and callback token live, so
 *  a step that never saw the command can still collect it. */
async function commandHandle(
  runtime: AgentRuntime,
  wake: WaiterWake
): Promise<SandboxCommandHandle> {
  const waiter = await runtime.platform.readWaiter({ waiterId: wake.waiter })
  const condition = waiter?.condition

  if (
    waiter === null ||
    condition === undefined ||
    condition.kind !== "command" ||
    waiter?.token === undefined
  ) {
    throw new Error("Parked command is no longer available.")
  }

  return { pid: condition.pid, token: waiter.token }
}
