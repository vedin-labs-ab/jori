import { useEffect, useState } from "react"
import { type FileSource, fileBlobCache } from "../cache/blob"
import { type FileDetail } from "../types"

/** How long the editor waits for the file's text before reporting an
 *  error. Editable text is capped at 1MB, so anything slower than this is
 *  a stall — though a late arrival still opens the editor, since content
 *  always beats an error notice. */
export const documentDeadline = 10_000

type DocumentState =
  | { status: "error" }
  | { status: "loading" }
  | { status: "ready"; saved: string; seed: string }

export type FileDocument = ReturnType<typeof useDocument>

/** The file's text, loaded once per mount through the blob cache —
 *  instant when a visit or sibling preload already fetched it. The source
 *  is frozen per mount: the signed url rotates with every query update
 *  and the editor already holds the freshest local text, so nothing here
 *  refetches mid-view; the cache keys on updatedAt, so a saved file never
 *  resurrects stale text on the next visit. `saved` tracks the persisted
 *  content; `seed` is what the editor was seeded with and never moves, so
 *  saving never resets the caret. */
export function useDocument(file: FileDetail, url: string) {
  const [frozen] = useState<FileSource>({
    fileId: file.fileId,
    size: file.size,
    updatedAt: file.updatedAt,
    url,
  })
  const [state, setState] = useState<DocumentState>({ status: "loading" })

  useEffect(() => loadDocument(frozen, setState), [frozen])

  function markSaved(text: string) {
    setState((current) =>
      current.status === "ready" ? { ...current, saved: text } : current
    )
  }

  return { markSaved, state }
}

/** Kicks off the text load with the deadline attached and returns the
 *  unmount cleanup; nothing here touches state after unmount. */
function loadDocument(
  source: FileSource,
  setState: (state: DocumentState) => void
) {
  let isMounted = true
  const fail = () => {
    if (isMounted) {
      setState({ status: "error" })
    }
  }
  const deadline = setTimeout(fail, documentDeadline)

  void fileBlobCache
    .load(source)
    .then(async (cached) => await cached.blob.text())
    .then((text) => {
      if (isMounted) {
        setState({ status: "ready", saved: text, seed: text })
      }
    })
    .catch(fail)
    .finally(() => clearTimeout(deadline))

  return () => {
    isMounted = false
    clearTimeout(deadline)
  }
}
