import { type HandoffSubject } from "../types"
import { type HandoffDeadline } from "./handoffs"

export function handoffSubjects(pending: HandoffDeadline[]): HandoffSubject[] {
  return pending.map((handoff) =>
    handoff.kind === "approval"
      ? { id: handoff.id, kind: "approval" }
      : { id: handoff.id, kind: "offer" }
  )
}
