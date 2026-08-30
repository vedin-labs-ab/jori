import { useNavigate } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { useCallback, useEffect, useMemo } from "react"
import { api } from "../../../convex/_generated/api"
import { type FileRow } from "./types"

// Previous/next navigation between files on the detail page. Siblings come
// from the same list query the files page subscribes to, in its canonical
// order (created desc) — the detail page cannot see the list's transient
// sort or filters, so the stable order is the predictable one.

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
 *  (newer), `next` the row below; `position` is 1-based, or null when the
 *  file is not in the list at all. */
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

  return {
    count: files.length,
    next: files[index + 1] ?? null,
    position: index + 1,
    previous: files[index - 1] ?? null,
  }
}

export function useFileSiblings(
  organizationId: string,
  fileId: FileRow["fileId"]
): FileSiblings {
  const files = useQuery(api.files.console.list, { organizationId })

  return useMemo(
    () => (files === undefined ? noSiblings : fileSiblings(files, fileId)),
    [files, fileId]
  )
}

/** Router navigation to a sibling's detail page. */
export function useFileNavigate() {
  const navigate = useNavigate()

  return useCallback(
    (file: { fileId: FileRow["fileId"] }) => {
      void navigate({ to: "/files/$fileId", params: { fileId: file.fileId } })
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
 *  out — and text-editor pages never mount this at all. */
export function useSiblingKeys(siblings: FileSiblings, isEnabled = true) {
  const goToFile = useFileNavigate()

  useEffect(() => {
    if (!isEnabled) {
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
