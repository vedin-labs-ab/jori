import { codingLimits } from "../../../contracts/coding"
import { optionalString } from "../../shared/input"

export function requiredTrimmedString(value: unknown, name: string) {
  const text = optionalString(value)

  if (text === undefined) {
    throw new Error(`Missing ${name}`)
  }

  return text
}

export function boundedInteger(
  value: unknown,
  fallback: number,
  minimum: number,
  maximum: number
) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback
  }

  return Math.min(maximum, Math.max(minimum, Math.floor(value)))
}

export function boundedTimeoutMs(value: unknown) {
  return boundedInteger(
    value,
    120_000,
    codingLimits.timeoutMinimum,
    codingLimits.timeoutMaximum
  )
}
