import { toJsonObject } from "../../contracts/json"

export function readToolInput(value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {}
  }

  return toJsonObject(value)
}

export function nullableText(value: unknown) {
  return typeof value === "string" && value.trim() !== "" ? value : null
}
