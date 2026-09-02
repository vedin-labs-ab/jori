import { type RuntimeContext } from "../contracts/runtime/worker"
import { type RuntimePlatform } from "./platform"
import { type SandboxRuntime } from "./sandbox/types"

export type AgentRuntime = {
  context: RuntimeContext
  platform: RuntimePlatform
  sandbox: SandboxRuntime
}

/** What recording and waiting need of a runtime: the platform to write
 *  through and the context that names the run. */
export type TraceRuntime = Pick<AgentRuntime, "context" | "platform">
