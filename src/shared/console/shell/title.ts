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

    return () => {
      document.title = previous
    }
  }, [title])
}
