import { boundedNumber } from "../shared/input"

export function normalizeExpectedVersion(value: unknown) {
  const version = optionalNumber(value)

  return version === undefined ? undefined : Math.max(0, version)
}

export function normalizeStateWrite(args: Record<string, unknown>) {
  if ("patch" in args) {
    return {
      type: "merge" as const,
      patch: args.patch,
    }
  }

  if ("value" in args) {
    return {
      type: "replace" as const,
      value: args.value,
    }
  }

  throw new Error("State update requires value or patch.")
}

export function normalizeListLimit(value: unknown) {
  return boundedNumber(value, 50, 1, 100)
}

export function optionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.trunc(value)
    : undefined
}
