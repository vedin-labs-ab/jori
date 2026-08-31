import { type HandoffSubject } from "./handoffs"
import { type RuntimeId } from "./ids"

type WaiterWakeReason = "resolved" | "message" | "cancelled" | "expired"

export type WaiterSubject =
  | HandoffSubject
  | { kind: "message"; id: RuntimeId<"messages"> }
  | { kind: "run"; id: RuntimeId<"runs"> }

export type WaiterCondition = {
  kind: "runs"
  runIds: RuntimeId<"runs">[]
}

export type WaiterWake = {
  reason: WaiterWakeReason
  subject?: WaiterSubject
}
