import { type RuntimeId } from "./ids"

export type AgentRunStatus = {
  runId: RuntimeId<"runs">
  title: string
  status: "queued" | "running" | "completed" | "failed" | "stopped"
  error: string | null
}
