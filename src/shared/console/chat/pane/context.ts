import {
  isReferenceKind,
  type ReferenceTarget,
} from "@contracts/replies/references"

// A chat opened from a resource's page carries that resource as its
// context, in the search: `/chat?context=<kind>:<id>`. The route's search
// validation reads it back with the parser here.

/** A new chat about the target, as a typed link the router checks: the
 *  chat's route takes `context` as the string spelled here and validates
 *  it into a `ReferenceTarget` on arrival. */
export function chatDestination(target: ReferenceTarget) {
  return { to: "/chat", search: contextSearch(target) } as const
}

export function contextSearch(target: ReferenceTarget): { context: string } {
  return { context: `${target.kind}:${target.id}` }
}

/** The context a `context` search value names, or nothing for a value
 *  that is not one. */
export function parseContextSearch(
  value: unknown
): ReferenceTarget | undefined {
  if (typeof value !== "string") {
    return undefined
  }

  const separator = value.indexOf(":")

  if (separator === -1) {
    return undefined
  }

  const kind = value.slice(0, separator)
  const id = value.slice(separator + 1)

  return isReferenceKind(kind) && id !== "" ? { kind, id } : undefined
}
