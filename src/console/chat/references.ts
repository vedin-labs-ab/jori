import { useQuery } from "convex/react"
import { type FunctionReturnType } from "convex/server"
import { useMemo, useRef } from "react"
import { referencePresentation } from "@/shared/console/chat/presentation"
import {
  type ChatMessage,
  type ChatReference,
  type ReferenceTarget,
  type ResolveReference,
} from "@/shared/console/chat/types"
import { api } from "../../../convex/_generated/api"

type ResolvedReference = FunctionReturnType<
  typeof api.messages.references.resolve
>[number]

/** Every target the loaded messages point at, once each: the context a
 *  person's message was sent from and the references in Jori's replies. */
export function referenceTargets(messages: ChatMessage[]) {
  const targets = new Map<string, ReferenceTarget>()

  for (const message of messages) {
    if (message.context !== undefined) {
      targets.set(targetKey(message.context), message.context)
    }

    for (const part of message.parts) {
      if (part.kind === "reference") {
        targets.set(targetKey(part.target), part.target)
      }
    }
  }

  return [...targets.values()]
}

/** Resolves the thread's references in one query. Targets already named
 *  stay named while a new one is looked up, and a target not yet answered
 *  shows as its kind until it is; one the viewer may not see, or that is
 *  gone, resolves to nothing, which the cards read as unavailable. */
export function useReferences(
  organizationId: string,
  messages: ChatMessage[]
): ResolveReference {
  const targets = useMemo(() => referenceTargets(messages), [messages])
  const resolved = useQuery(
    api.messages.references.resolve,
    targets.length === 0 ? "skip" : { organizationId, targets }
  )
  const known = useRef(new Map<string, ChatReference | undefined>())

  return useMemo<ResolveReference>(() => {
    for (const reference of resolved ?? []) {
      known.current.set(targetKey(reference), toChatReference(reference))
    }

    const snapshot = new Map(known.current)

    return (target) => {
      const key = targetKey(target)

      return snapshot.has(key) ? snapshot.get(key) : pending(target)
    }
  }, [resolved])
}

function toChatReference(reference: ResolvedReference) {
  return reference.unavailable
    ? undefined
    : {
        kind: reference.kind,
        id: reference.id,
        name: reference.name,
        ...(reference.detail === undefined ? {} : { detail: reference.detail }),
      }
}

/** A target still being looked up reads as its kind, openable already. */
function pending(target: ReferenceTarget): ChatReference {
  return { ...target, name: referencePresentation(target.kind, "").label }
}

function targetKey(target: ReferenceTarget) {
  return `${target.kind}:${target.id}`
}
