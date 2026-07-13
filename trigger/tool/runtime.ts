import { type RuntimePlatform } from "../platform"
import { type SandboxRuntime } from "../sandbox/types"
import { type RuntimeContext } from "../types"

export type ToolRuntime = {
  convex: RuntimePlatform
  context: RuntimeContext
  sandbox: SandboxRuntime
}
