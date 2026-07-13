import { type RuntimeContext } from "../../contracts/runtime/worker"
import { type RuntimePlatform } from "../platform"
import { type SandboxRuntime } from "../sandbox/types"

export type ToolRuntime = {
  convex: RuntimePlatform
  context: RuntimeContext
  sandbox: SandboxRuntime
}
