import { useEffect } from "react"

/** What the document wears while a drag runs: the grabbing hand over
 *  everything — the rule on descendants outranks the cursors links and
 *  buttons set for themselves — and no text selection under the pointer. */
export const draggingBodyClassNames = [
  "cursor-grabbing",
  "select-none",
  "[&_*]:cursor-grabbing!",
]

/** Puts the dragging classes on the body for as long as `isDragging`
 *  holds, and takes them off again on end, cancel, or unmount. */
export function useDraggingBody(isDragging: boolean) {
  useEffect(() => {
    if (!isDragging) {
      return
    }

    return markDragging(document.body)
  }, [isDragging])
}

/** Marks an element as the surface of a running drag; the returned
 *  function clears the mark. */
export function markDragging(element: HTMLElement) {
  element.classList.add(...draggingBodyClassNames)

  return () => element.classList.remove(...draggingBodyClassNames)
}
