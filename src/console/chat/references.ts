import { useQuery } from "convex/react"
import { type FunctionReturnType } from "convex/server"
import { useEffect, useMemo, useRef, useState } from "react"
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
 *  person's message was sent from, the resources its text mentions, and
 *  the references in Jori's replies. */
export function referenceTargets(
  messages: ChatMessage[],
  extra: ReferenceTarget[] = none
) {
  const targets = new Map<string, ReferenceTarget>()

  for (const target of extra) {
    targets.set(targetKey(target), target)
  }

  for (const message of messages) {
    if (message.context !== undefined) {
      targets.set(targetKey(message.context), message.context)
    }

    for (const reference of message.references ?? []) {
      targets.set(targetKey(reference), reference)
    }

    for (const part of message.parts) {
      if (part.kind === "reference") {
        targets.set(targetKey(part.target), part.target)
      }
    }
  }

  return [...targets.values()]
}

/** Resolves the thread's references in one query, with any the host
 *  names besides — the resources the composer mentions before they are
 *  sent, say; see `useReferenceTargets`. */
export function useReferences(
  organizationId: string,
  messages: ChatMessage[],
  extra: ReferenceTarget[] = none
): ResolveReference {
  return useReferenceTargets(
    organizationId,
    useMemo(() => referenceTargets(messages, extra), [extra, messages])
  )
}

const none: ReferenceTarget[] = []

/** Resolves the targets not yet named, in one query; a name, once
 *  known, is kept, so a new message asks for its own targets alone. A
 *  target not yet answered shows as its kind until it is; one the viewer
 *  may not see, or that is gone, resolves to nothing, which the cards
 *  read as unavailable. */
export function useReferenceTargets(
  organizationId: string,
  targets: ReferenceTarget[]
): ResolveReference {
  const known = useRef(new Map<string, ChatReference | undefined>())
  const [version, setVersion] = useState(0)
  const unnamed = targets.filter(
    (target) => !known.current.has(targetKey(target))
  )
  const resolved = useQuery(
    api.messages.references.resolve,
    unnamed.length === 0 ? "skip" : { organizationId, targets: unnamed }
  )

  useEffect(() => {
    if (resolved === undefined) {
      return
    }

    for (const reference of resolved) {
      known.current.set(targetKey(reference), toChatReference(reference))
    }

    setVersion((count) => count + 1)
  }, [resolved])

  // The snapshot is what the callback reads, so a name landing later
  // never changes what an earlier render was given.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the version counts the names landed in the ref
  return useMemo<ResolveReference>(() => {
    const snapshot = new Map(known.current)

    return (target) => {
      const key = targetKey(target)

      return snapshot.has(key) ? snapshot.get(key) : pending(target)
    }
  }, [version])
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
