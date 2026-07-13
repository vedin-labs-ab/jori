import { type RuntimeId } from "./ids"

export type AgentRunPayload = {
  runId: RuntimeId<"runs">
}

export type SandboxCleanupPayload = {
  expiresAt?: number
  runId: RuntimeId<"runs">
  sandboxId: string
}
