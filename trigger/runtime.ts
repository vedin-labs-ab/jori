import { type RuntimeContext } from "../contracts/runtime/worker"
import { type RuntimePlatform } from "./platform"
import { type SandboxRuntime } from "./sandbox/types"

export type AgentRuntime = {
  context: RuntimeContext
  platform: RuntimePlatform
  sandbox: SandboxRuntime
}
