import { useNavigate, useSearch } from "@tanstack/react-router"
import { type MutableRefObject, useEffect, useMemo, useRef } from "react"
import { type ExecutionItem, pageSize } from "@/shared/console/runs/types"

/** A deep-link destination: a run to reveal, or a 0-based page to restore. */
export type PageTarget = { run: string } | { page: number }

/**
 * Reads the /runs search params into a seek target. A restored page wins
 * over a run target so refreshes after manual paging stay put; a fresh deep
 * link arrives without a page and seeks the run.
 */
export function useSearchTarget() {
  const { page, run } = useSearch({ from: "/_workspace/runs" })

  return useMemo<PageTarget | undefined>(() => {
    if (page !== undefined) {
      return { page: page - 1 }
    }

    return run === undefined ? undefined : { run }
  }, [page, run])
}

/** Mirrors the current page into the URL so refreshes keep their place. */
export function usePageSearchSync(pageIndex: number) {
  const navigate = useNavigate()

  useEffect(() => {
    void navigate({
      replace: true,
      search: (previous) => ({
        ...previous,
        page: pageIndex === 0 ? undefined : pageIndex + 1,
      }),
      to: "/runs",
    })
  }, [navigate, pageIndex])
}

/**
 * Walks cursor pagination toward a deep-link target, loading pages until the
 * run appears or the page is reachable, then jumps once and steps aside so
 * manual paging is never hijacked. Exhausting the list settles a page target
 * on the last page there is.
 */
export function useSeekTarget({
  pageLoader,
  rows,
  setPageIndex,
  target,
}: {
  pageLoader: { loadMore: (numItems: number) => void; status: string }
  rows: ExecutionItem[]
  setPageIndex: (updater: (current: number) => number) => void
  target: PageTarget | undefined
}) {
  const pending = useRef(target)

  useEffect(() => {
    seekStep({ pageLoader, pending, rows, setPageIndex })
  }, [pageLoader, rows, setPageIndex])
}

function seekStep({
  pageLoader,
  pending,
  rows,
  setPageIndex,
}: {
  pageLoader: { loadMore: (numItems: number) => void; status: string }
  pending: MutableRefObject<PageTarget | undefined>
  rows: ExecutionItem[]
  setPageIndex: (updater: (current: number) => number) => void
}) {
  const sought = pending.current

  if (sought === undefined) {
    return
  }

  const reached = seekIndex(sought, rows)

  if (reached >= 0) {
    pending.current = undefined
    setPageIndex(() => Math.floor(reached / pageSize))
    return
  }

  if (pageLoader.status === "CanLoadMore") {
    pageLoader.loadMore(pageSize)
  } else if (pageLoader.status === "Exhausted") {
    pending.current = undefined
    setPageIndex(() => settledIndex(sought, rows))
  }
}

function seekIndex(sought: PageTarget, rows: ExecutionItem[]) {
  if ("run" in sought) {
    return rows.findIndex((row) => row.id === sought.run)
  }

  return rows.length > sought.page * pageSize ? sought.page * pageSize : -1
}

/** An exhausted seek keeps page 1 for a missing run and clamps a page
 *  target onto the last page there is. */
function settledIndex(sought: PageTarget, rows: ExecutionItem[]) {
  if ("run" in sought) {
    return 0
  }

  return Math.max(0, Math.ceil(rows.length / pageSize) - 1)
}
