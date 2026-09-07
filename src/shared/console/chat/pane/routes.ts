import { type ReferenceTarget } from "../types"

/** A target's own page, as ConsoleLink takes it. */
export type TargetDestination = {
  to: string
  params?: Record<string, string>
}

/** Where a target opens in full: a run on the Activity page, everything
 *  else on its own page. */
export function targetDestination(target: ReferenceTarget): TargetDestination {
  switch (target.kind) {
    case "chat":
      return {
        to: "/chat/$conversationId",
        params: { conversationId: target.id },
      }
    case "file":
      return { to: "/files/$fileId", params: { fileId: target.id } }
    case "table":
      return { to: "/tables/$tableId", params: { tableId: target.id } }
    case "store":
      return { to: "/stores/$storeId", params: { storeId: target.id } }
    case "job":
      return { to: "/jobs/$jobId", params: { jobId: target.id } }
    case "folder":
      return { to: "/folders/$folderId", params: { folderId: target.id } }
    case "run":
      return { to: "/runs" }
  }
}

/** One string per target, for keys and tab values. */
export function targetKey(target: ReferenceTarget) {
  return `${target.kind}:${target.id}`
}

export function isSameTarget(left: ReferenceTarget, right: ReferenceTarget) {
  return left.kind === right.kind && left.id === right.id
}
