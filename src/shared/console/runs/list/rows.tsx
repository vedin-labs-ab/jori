import { useEffect, useRef } from "react"
import { ConsoleScrollableGrid } from "../../layout"
import { ConsoleListEmpty } from "../../list/empty"
import { ConsoleListLoading } from "../../list/loading"
import { ExecutionRow, type RunRowSlots } from "../row"
import { displayNowForRun } from "../time"
import { type ExecutionItem } from "../types"
import { RunsEmptyState } from "./empty"

/** The page's rows: a spinner until the first page lands, the empty
 *  state when nothing matches, and otherwise one row per run in a stack
 *  that scrolls in place. Each row reads the clock as its run needs it:
 *  to the second while it is live, to the minute once it has settled. */
export function ExecutionRows({
  expanded,
  focusRunId,
  hasFilters,
  isLoading,
  now,
  onPreload,
  openRunId,
  rows,
  showAudience,
  stop,
}: RunRowSlots & {
  /** Deep links (billing receipts, /runs?run=...) land with that row open
   *  and scrolled into view. */
  focusRunId?: string
  /** Whether filters narrowed the list, for the empty state's wording. */
  hasFilters: boolean
  /** The first page is still on its way. */
  isLoading: boolean
  now: number
  /** A run shown open from the start, with nothing scrolling to it: a
   *  page that opens on a run rather than lands on one. */
  openRunId?: string
  rows: ExecutionItem[]
  showAudience: boolean
}) {
  useFocusScroll(focusRunId, rows)

  if (isLoading) {
    return <ConsoleListLoading />
  }

  if (rows.length === 0) {
    return (
      <ConsoleListEmpty>
        <RunsEmptyState hasFilters={hasFilters} />
      </ConsoleListEmpty>
    )
  }

  return (
    // auto-rows-max keeps row heights at their content size; without it the
    // overflow-hidden articles let the definite-height grid compress its
    // tracks to fit instead of overflowing into the scrollbar.
    <ConsoleScrollableGrid>
      {rows.map((execution) => (
        <ExecutionRow
          defaultOpen={
            execution.id === focusRunId || execution.id === openRunId
          }
          execution={execution}
          expanded={expanded}
          key={execution.id}
          now={displayNowForRun(execution, now)}
          onPreload={onPreload}
          showAudience={showAudience}
          stop={stop}
        />
      ))}
    </ConsoleScrollableGrid>
  )
}

/** Brings a deep link's run into view once its row is on the page, and
 *  then leaves the scroll position alone: later pages of the same list
 *  are the reader's to move through. */
function useFocusScroll(focusRunId: string | undefined, rows: ExecutionItem[]) {
  const scrolledTo = useRef<string>(undefined)

  useEffect(() => {
    if (
      focusRunId === undefined ||
      scrolledTo.current === focusRunId ||
      !rows.some((run) => run.id === focusRunId)
    ) {
      return
    }

    scrolledTo.current = focusRunId
    document.getElementById(focusRunId)?.scrollIntoView({ block: "center" })
  }, [focusRunId, rows])
}
