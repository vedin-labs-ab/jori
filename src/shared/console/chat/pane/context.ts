import { type MessageContext } from "@contracts/replies/answers"
import { type ReferenceKind } from "@contracts/replies/parts"
import { referenceKinds } from "@contracts/replies/references"

// A chat opened from a resource's page carries that resource as its
// context, in the search: `/chat?context=<kind>:<id>`. The route's search
// validation reads it back with the parser here.

/** A new chat about the target, as a typed link the router checks: the
 *  chat's route takes `context` as the string spelled here and validates
 *  it into a `MessageContext` on arrival. */
export function chatDestination(target: MessageContext) {
  return { to: "/chat", search: contextSearch(target) } as const
}

export function contextSearch(target: MessageContext): { context: string } {
  return { context: `${target.kind}:${target.id}` }
}

/** The context a `context` search value names, or nothing for a value
 *  that is not one. */
export function parseContextSearch(value: unknown): MessageContext | undefined {
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

function isReferenceKind(value: string): value is ReferenceKind {
  return (referenceKinds as readonly string[]).includes(value)
}
