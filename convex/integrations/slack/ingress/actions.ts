import { isRecord } from "../../../../contracts/json"

// Readers for Slack block_actions interactivity payloads, shared by the
// approval and integration-offer button handlers.
export function readFirstAction(actions: unknown) {
  if (!Array.isArray(actions) || actions.length === 0) {
    return null
  }

  const action: unknown = actions[0]

  return isRecord(action) ? action : null
}

export function readNestedString(value: unknown, key: string) {
  if (!isRecord(value)) {
    return null
  }

  const child = value[key]

  return typeof child === "string" && child !== "" ? child : null
}
