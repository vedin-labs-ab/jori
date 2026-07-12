import { type MiloConvexClient } from "../convex"
import { type SandboxRuntime } from "../sandbox/types"
import { type RuntimeContext } from "../types"

export type ToolRuntime = {
  convex: MiloConvexClient
  context: RuntimeContext
  sandbox: SandboxRuntime
}
