import { useCallback, useEffect } from "react"
import { useConsoleNavigate } from "../shell/location"
import { type FileRow } from "./types"

// Previous/next navigation between files on the detail page. Siblings come
// from the same list the files page shows, in its canonical order (created
// desc) — the detail page cannot see the list's transient sort or filters,
// so the stable order is the predictable one.

export type FileSiblings = {
  count: number
  next: FileRow | null
  position: number | null
  previous: FileRow | null
}

/** What the toolbar shows before the list resolves: both ends, disabled. */
export const noSiblings: FileSiblings = {
  count: 0,
  next: null,
  position: null,
  previous: null,
}

/** The current file's neighbors in list order. `previous` is the row above
 *  (newer), `next` the row below, and the ends wrap — past the last file
 *  navigation comes back around to the first. Alone in the list, a file
 *  has no neighbors. `position` is 1-based, or null when the file is not
 *  in the list at all. */
export function fileSiblings<Row extends { fileId: string }>(
  files: readonly Row[],
  fileId: Row["fileId"]
): {
  count: number
  next: Row | null
  position: number | null
  previous: Row | null
} {
  const index = files.findIndex((file) => file.fileId === fileId)

  if (index === -1) {
    return { count: files.length, next: null, position: null, previous: null }
  }

  if (files.length < 2) {
    return { count: files.length, next: null, position: 1, previous: null }
  }

  return {
    count: files.length,
    next: files[(index + 1) % files.length] ?? null,
    position: index + 1,
    previous: files[(index - 1 + files.length) % files.length] ?? null,
  }
}

/** Navigation to a sibling's detail page. */
export function useFileNavigate() {
  const navigate = useConsoleNavigate()

  return useCallback(
    (file: { fileId: FileRow["fileId"] }) => {
      navigate({ to: "/files/$fileId", params: { fileId: file.fileId } })
    },
    [navigate]
  )
}

/** The event fields the arrow guard reads, kept structural for tests. */
type ArrowKeyEvent = {
  altKey: boolean
  ctrlKey: boolean
  defaultPrevented: boolean
  metaKey: boolean
  shiftKey: boolean
  target: EventTarget | null
}

/** Elements whose own arrow-key behavior outranks file navigation: text
 *  entry moves the caret, selects move the option, media seeks. */
const arrowOwningTags = new Set([
  "AUDIO",
  "INPUT",
  "SELECT",
  "TEXTAREA",
  "VIDEO",
])

/** True when an arrow keypress is free to mean file navigation: nothing
 *  upstream claimed it, no modifier turns it into another gesture, and
 *  focus is not inside a control that owns its arrow keys. */
export function allowsArrowNavigation(event: ArrowKeyEvent): boolean {
  if (
    event.defaultPrevented ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey ||
    event.shiftKey
  ) {
    return false
  }

  const target = event.target

  if (!(target instanceof HTMLElement)) {
    return true
  }

  return !(arrowOwningTags.has(target.tagName) || target.isContentEditable)
}

/** Window-level ←/→ navigation to the previous/next file. Callers pass
 *  `isEnabled` to gate by state — the image viewer only while fully zoomed
 *  out — and text-editor pages never mount this at all. A file with no
 *  neighbors — alone in its list, or shown outside it — binds nothing. */
export function useSiblingKeys(siblings: FileSiblings, isEnabled = true) {
  const goToFile = useFileNavigate()

  useEffect(() => {
    const hasNeighbors = siblings.previous !== null || siblings.next !== null

    if (!(isEnabled && hasNeighbors)) {
      return
    }

    const handleKey = (event: KeyboardEvent) => {
      const target =
        event.key === "ArrowLeft"
          ? siblings.previous
          : event.key === "ArrowRight"
            ? siblings.next
            : null

      if (target === null || !allowsArrowNavigation(event)) {
        return
      }

      event.preventDefault()
      goToFile(target)
    }

    window.addEventListener("keydown", handleKey)

    return () => window.removeEventListener("keydown", handleKey)
  }, [goToFile, isEnabled, siblings])
}
