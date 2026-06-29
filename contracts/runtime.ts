export const agentTaskId = "milo-agent-run"
export const cleanupTaskId = "milo-sandbox-cleanup"

export const runtimeToolMetadataKinds = ["target", "scope", "outcome"] as const

export type RuntimeToolMetadataKind = (typeof runtimeToolMetadataKinds)[number]

export type RuntimeToolMetadataItem = {
  kind: RuntimeToolMetadataKind
  text: string
}

export type SurfaceReactionTarget =
  | { messageTs: string }
  | { type: "comment"; commentId: string }
  | { type: "comment"; commentId: number }
  | { type: "issue"; issueId: string }
