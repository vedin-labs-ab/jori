import { isRecord } from "../../../contracts/json"
import { boundedNumber, requiredStringArray } from "../../shared/input"

export function normalizeExpectedVersion(value: unknown) {
  const version = optionalNumber(value)

  return version === undefined ? undefined : Math.max(0, version)
}

export function normalizeStateWrite(args: Record<string, unknown>) {
  if ("claim" in args) {
    return normalizeStateClaim(args.claim)
  }

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

  throw new Error("State update requires value, patch, or claim.")
}

function normalizeStateClaim(claim: unknown) {
  if (!isRecord(claim)) {
    throw new Error("claim must be an object with path and value.")
  }

  return {
    type: "claim" as const,
    path: requiredStringArray(claim.path, "claim.path"),
    value: claim.value,
  }
}

export function normalizeListLimit(value: unknown) {
  return boundedNumber(value, 50, 1, 100)
}

export function optionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.trunc(value)
    : undefined
}
