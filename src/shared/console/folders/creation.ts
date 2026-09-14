import { useState } from "react"
import { type EditSurface, useEditing } from "../edit/state"
import { type CreationRequest } from "./types"

/** Tables and stores create inline; files and jobs keep their setup flows. */
export function useCreationRequests(surface: EditSurface) {
  const editing = useEditing()
  const [request, setRequest] = useState<CreationRequest>()
  const create = (next: CreationRequest | undefined) => {
    if (next?.creation === "table" || next?.creation === "store") {
      editing?.create(next.creation, next.folderId, surface)
    } else {
      setRequest(next)
    }
  }
  return [request, create] as const
}
