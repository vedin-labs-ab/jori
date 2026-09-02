// Dwell-to-expand for drags: hold the pointer over the same folder long
// enough and the tree opens it, so a drag can descend without releasing.

/** How long a drag dwells on a folder row before it auto-expands. */
export const expandHoverDelay = 600

export type HoverExpander = {
  hover: (folderId: string | null) => void
  reset: () => void
}

/** Tracks the drop target under a drag and fires `onExpand` after an
 *  unbroken dwell. Re-reporting the same target keeps the running timer;
 *  a different target restarts it, and null (or `reset`) clears it. */
export function createHoverExpander(
  onExpand: (folderId: string) => void,
  delay: number = expandHoverDelay
): HoverExpander {
  let pendingId: string | null = null
  let timer: ReturnType<typeof setTimeout> | undefined

  function reset() {
    clearTimeout(timer)
    timer = undefined
    pendingId = null
  }

  function hover(folderId: string | null) {
    if (folderId === pendingId) {
      return
    }

    reset()

    if (folderId === null) {
      return
    }

    pendingId = folderId
    timer = setTimeout(() => {
      reset()
      onExpand(folderId)
    }, delay)
  }

  return { hover, reset }
}
