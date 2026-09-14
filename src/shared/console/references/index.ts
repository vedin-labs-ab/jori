import { type ReferenceKind } from "@contracts/replies/parts"

/** What a reference part or a message's context points at. */
export type ReferenceTarget = {
  kind: ReferenceKind
  id: string
}

/** One string per target — `kind:id`, as a resource token carries it —
 *  for keys, tab values, and mention ids. */
export function targetKey(target: ReferenceTarget) {
  return `${target.kind}:${target.id}`
}

export function isSameTarget(left: ReferenceTarget, right: ReferenceTarget) {
  return left.kind === right.kind && left.id === right.id
}

/** A target as the host resolved it, for the card that shows it. */
export type ReferenceView = {
  kind: ReferenceKind
  id: string
  name: string
  /** The resource's containing folder, independently of its reference. */
  folderId?: string
  /** One line under the name: where it is filed, what it holds. */
  detail?: string
  /** The host knows the target but can no longer open it. */
  unavailable?: boolean
}

export type ResolveReference = (
  target: ReferenceTarget
) => ReferenceView | undefined
