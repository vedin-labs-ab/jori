import { useState } from "react"
import { type ReferenceView } from "../references"

/** An explicit choice, including No folder, survives the entry lookup updating. */
export function useChatLocation(reference: ReferenceView | undefined) {
  const [selected, select] = useState<{ folderId: string | null }>()
  const suggested =
    reference?.kind === "folder" ? reference.id : reference?.folderId
  return {
    folderId: selected === undefined ? (suggested ?? null) : selected.folderId,
    select: (folderId: string | null) => select({ folderId }),
    initialReference: reference?.kind === "folder" ? undefined : reference,
  }
}
