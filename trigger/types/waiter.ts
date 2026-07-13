import { type HandoffSubject } from "./handoff"
import { type ConvexId } from "./id"

type WaiterWakeReason = "resolved" | "message" | "cancelled" | "expired"

type WaiterSubject =
  | HandoffSubject
  | { kind: "message"; id: ConvexId<"messages"> }
  | { kind: "run"; id: ConvexId<"runs"> }

export type WaiterCondition = {
  kind: "runs"
  runIds: ConvexId<"runs">[]
}

export type WaiterWake = {
  reason: WaiterWakeReason
  subject?: WaiterSubject
}
