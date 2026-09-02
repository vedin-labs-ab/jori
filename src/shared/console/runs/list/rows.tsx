import { ConsoleScrollableGrid } from "../../layout"
import { ConsoleListLoading } from "../../list/loading"
import { ExecutionRow, type RunRowSlots } from "../row"
import { displayNowForRun } from "../time"
import { type ExecutionItem } from "../types"
import { EmptyExecutions } from "./empty"

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
  rows,
  showAudience,
  stop,
}: RunRowSlots & {
  /** Deep links (billing receipts, /runs?run=...) land with that row open. */
  focusRunId?: string
  /** Whether filters narrowed the list, for the empty state's wording. */
  hasFilters: boolean
  /** The first page is still on its way. */
  isLoading: boolean
  now: number
  rows: ExecutionItem[]
  showAudience: boolean
}) {
  if (isLoading) {
    return <ConsoleListLoading />
  }

  return (
    // auto-rows-max keeps row heights at their content size; without it the
    // overflow-hidden articles let the definite-height grid compress its
    // tracks to fit instead of overflowing into the scrollbar.
    <ConsoleScrollableGrid>
      {rows.length === 0 ? <EmptyExecutions hasFilters={hasFilters} /> : null}
      {rows.length > 0
        ? rows.map((execution) => (
            <ExecutionRow
              defaultOpen={execution.id === focusRunId}
              execution={execution}
              expanded={expanded}
              key={execution.id}
              now={displayNowForRun(execution, now)}
              onPreload={onPreload}
              showAudience={showAudience}
              stop={stop}
            />
          ))
        : null}
    </ConsoleScrollableGrid>
  )
}
