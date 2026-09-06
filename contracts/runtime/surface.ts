import { type MessageSurface } from "../integrations"

export type SurfaceReactionTarget =
  | { messageTs: string }
  | { type: "comment"; commentId: string }
  | { type: "comment"; commentId: number }
  | { type: "issue"; issueId: string }

/** Surface tools whose completion is, by itself, visible communication. */
export const surfaceCommunicationTools = ["send_reply", "add_reaction"] as const

// Convex derives a run's `communicated` state from their traces; the worker
// marks the active surface when they succeed.
export function isSurfaceCommunicationTool(name: unknown) {
  return surfaceCommunicationTools.some((tool) => tool === name)
}

// A convex-routed tool call that communicated visibly: an integration offer
// whose card was delivered on the run's active surface.
export function isVisibleCommunicationTool(
  toolName: string,
  result: unknown,
  activeSurface: MessageSurface
) {
  return (
    toolName === "offer_integration" &&
    deliveredOnActiveSurface(result, activeSurface)
  )
}

function deliveredOnActiveSurface(
  result: unknown,
  activeSurface: MessageSurface
) {
  if (typeof result !== "object" || result === null || Array.isArray(result)) {
    return false
  }

  const delivery = (result as { delivery?: unknown }).delivery

  if (
    typeof delivery !== "object" ||
    delivery === null ||
    Array.isArray(delivery)
  ) {
    return false
  }

  return (
    (delivery as { status?: unknown }).status === "delivered" &&
    (delivery as { surface?: unknown }).surface === activeSurface
  )
}
