import { useMemo, useState } from "react"
import { ConsolePageLayout } from "@/shared/console/layout"
import { ConsoleListPager } from "@/shared/console/list/pager"
import { useClientPagination } from "@/shared/console/list/pagination"
import { ExecutionFilters } from "@/shared/console/runs/list/filters"
import { ExecutionRows } from "@/shared/console/runs/list/rows"
import { useExecutionClock } from "@/shared/console/runs/time"
import { pageSize } from "@/shared/console/runs/types"
import { filterRuns, hasRunFilters, type RunFilters } from "../derive/runs"
import { useDemoWorkspace } from "../workspace"
import { useRunRowSlots } from "./slots"

const itemLabel = { singular: "run", plural: "runs" }

/** The Activity page over the workspace: the filters, the rows they
 *  narrow, and each row's detail, stop control, and requests bound to
 *  the workspace's own actions. */
export function RunsPage({ openRunId }: { openRunId?: string }) {
  const { actions, state } = useDemoWorkspace()
  const [filters, setFilters] = useState<RunFilters>({
    approvalFilter: "any",
    audienceFilter: "all",
    query: "",
    runFilter: "all",
  })
  const now = useExecutionClock(state.runs, state.now)
  const rows = useMemo(
    () => filterRuns(state.runs, filters, now),
    [state.runs, filters, now]
  )
  const hasFilters = hasRunFilters(filters)
  const pagination = useClientPagination({
    hasFilters,
    isReady: true,
    itemLabel,
    items: rows,
    pageSize,
  })
  const slots = useRunRowSlots(actions, state.activity)
  const update = (patch: Partial<RunFilters>) => {
    setFilters((current) => ({ ...current, ...patch }))
    pagination.reset()
  }

  return (
    <ExecutionFilters
      approvalFilter={filters.approvalFilter}
      audienceFilter={filters.audienceFilter}
      query={filters.query}
      runFilter={filters.runFilter}
      setApprovalFilter={(approvalFilter) => update({ approvalFilter })}
      setAudienceFilter={(audienceFilter) => update({ audienceFilter })}
      setQuery={(query) => update({ query })}
      setRunFilter={(runFilter) => update({ runFilter })}
    >
      <ConsolePageLayout>
        <ExecutionRows
          {...slots}
          hasFilters={hasFilters}
          isLoading={false}
          now={now}
          openRunId={openRunId}
          rows={pagination.visibleRows}
          showAudience={filters.audienceFilter === "all"}
        />
        <ConsoleListPager pagination={pagination} />
      </ConsolePageLayout>
    </ExecutionFilters>
  )
}
