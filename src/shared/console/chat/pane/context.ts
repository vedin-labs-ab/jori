import { type MessageContext } from "@contracts/replies/answers"
import { type ReferenceKind, referenceKinds } from "@contracts/replies/parts"
import { type ComponentProps } from "react"
import { type ConsoleLink } from "../../shell/link"

// A chat opened from a resource's page carries that resource as its
// context, in the search: `/chat?context=<kind>:<id>`. The route's search
// validation reads it back with the parser here.

/** A new chat about the target. The console's route for the chat lands
 *  with the chat binding; until it does the router cannot name the path
 *  or type its search, so, like `conversationDestination`, this is
 *  written as a destination the router does not check. Once the route
 *  validates `context`, the action can spell both out as typed props. */
export function chatDestination(
  target: MessageContext
): Pick<ComponentProps<typeof ConsoleLink>, "search" | "to"> {
  return { to: "/chat", search: contextSearch(target) as never }
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
