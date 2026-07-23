import { type RuntimeId } from "./ids"

export type AgentRunStatus = {
  runId: RuntimeId<"runs">
  title: string
  status: "queued" | "running" | "completed" | "failed" | "stopped"
  error: string | null
  /** Outcome the child returned via finish_run; null until it completes. */
  result: string | null
}

export function isTerminalAgentRunStatus(status: AgentRunStatus["status"]) {
  return status === "completed" || status === "failed" || status === "stopped"
}
