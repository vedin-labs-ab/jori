export const agentTaskId = "milo-agent-run"
export const cleanupTaskId = "milo-sandbox-cleanup"

export type SurfaceReactionTarget =
  | { messageTs: string }
  | { type: "comment"; commentId: string }
  | { type: "comment"; commentId: number }
  | { type: "issue"; issueId: string }
