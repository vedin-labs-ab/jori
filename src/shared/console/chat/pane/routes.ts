import { type ReferenceTarget } from "../types"

/** One string per target, for keys and tab values. */
export function targetKey(target: ReferenceTarget) {
  return `${target.kind}:${target.id}`
}

export function isSameTarget(left: ReferenceTarget, right: ReferenceTarget) {
  return left.kind === right.kind && left.id === right.id
}
