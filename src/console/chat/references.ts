import { useQuery } from "convex/react"
import { type FunctionReturnType } from "convex/server"
import { useCallback, useEffect, useMemo, useState } from "react"
import { type ChatMessage } from "@/shared/console/chat/types"
import { referencePresentation } from "@/shared/console/references/presentation"
import { api } from "../../../convex/_generated/api"
import {
  type ReferenceTarget,
  type ReferenceView,
  type ResolveReference,
  targetKey,
} from "../../shared/console/references"

type ResolvedReference = FunctionReturnType<
  typeof api.messages.references.resolve
>[number]

/** Every inline mention and reply reference in the loaded messages, once. */
export function referenceTargets(
  messages: ChatMessage[],
  extra: ReferenceTarget[] = none
) {
  const targets = new Map<string, ReferenceTarget>()

  for (const target of extra) {
    targets.set(targetKey(target), target)
  }

  for (const message of messages) {
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
  const [known, setKnown] = useState(
    () => new Map<string, ReferenceView | undefined>()
  )
  const unnamed = targets.filter((target) => !known.has(targetKey(target)))
  const resolved = useQuery(
    api.messages.references.resolve,
    unnamed.length === 0 ? "skip" : { organizationId, targets: unnamed }
  )

  useEffect(() => {
    if (resolved === undefined) {
      return
    }

    setKnown((previous) => {
      const next = new Map(previous)

      for (const reference of resolved) {
        next.set(targetKey(reference), toChatReference(reference))
      }

      return next
    })
  }, [resolved])

  return useCallback<ResolveReference>(
    (target) => {
      const key = targetKey(target)

      return known.has(key) ? known.get(key) : pending(target)
    },
    [known]
  )
}

function toChatReference(reference: ResolvedReference) {
  return reference.unavailable
    ? undefined
    : {
        kind: reference.kind,
        id: reference.id,
        name: reference.name,
        folderId: reference.folderId,
        ...(reference.detail === undefined ? {} : { detail: reference.detail }),
      }
}

/** A target still being looked up reads as its kind, openable already. */
function pending(target: ReferenceTarget): ReferenceView {
  return { ...target, name: referencePresentation(target.kind, "").label }
}
