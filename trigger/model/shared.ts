import { toJsonObject } from "../../contracts/json"

export const beginExecutionMessage = "Begin executing the current task."

export function readToolInput(value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {}
  }

  return toJsonObject(value)
}

export function nullableText(value: unknown) {
  return typeof value === "string" && value.trim() !== "" ? value : null
}
