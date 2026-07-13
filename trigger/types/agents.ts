import { type ConvexId } from "./id"

export type AgentRunStatus = {
  runId: ConvexId<"runs">
  title: string
  status: "queued" | "running" | "completed" | "failed" | "stopped"
  error: string | null
}
