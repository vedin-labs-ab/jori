import {
  type DeliveryKind,
  type SlackDeliveryTarget,
} from "@contracts/playbooks/delivery"

export type DeliveryMode = "email" | SlackDeliveryTarget["kind"]

export function deliveryModeCount(kinds: DeliveryKind[]) {
  return Number(kinds.includes("email")) + Number(kinds.includes("slack")) * 2
}
