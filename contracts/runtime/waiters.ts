import { type HandoffSubject } from "./handoffs"
import { type RuntimeId } from "./ids"

type WaiterWakeReason = "resolved" | "message" | "cancelled" | "expired"

export type ParkedWaiter = {
  eventId: string
  waiterId: RuntimeId<"waiters">
}

/** What a waiter remembers so the tool can collect its output after waking. */
export type ParkedCommand = {
  condition?: WaiterCondition
  token?: string
}

export type WaiterSubject =
  | HandoffSubject
  | { kind: "message"; id: RuntimeId<"messages"> }
  | { kind: "run"; id: RuntimeId<"runs"> }

/** What the run is parked on. Child runs resolve when every named run is
 *  terminal; a command resolves when the sandbox reports its pid finished. */
export type WaiterCondition =
  | { kind: "runs"; runIds: RuntimeId<"runs">[] }
  | { kind: "command"; pid: string }

export type WaiterWake = {
  reason: WaiterWakeReason
  subject?: WaiterSubject
  waiter: RuntimeId<"waiters">
}
