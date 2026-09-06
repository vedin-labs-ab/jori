import { useEffect } from "react"

/** Names the browser tab after the page's own data once it has loaded —
 *  a job's name, say — and hands the previous name back on the way out,
 *  so the route's generic title returns when the page is left. */
export function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    if (title === undefined) {
      return
    }

    const previous = document.title

    document.title = title

    // The router's head sets the next page's title before this cleanup
    // runs, so restoring blindly would put the old title back over it.
    return () => {
      if (document.title === title) {
        document.title = previous
      }
    }
  }, [title])
}
