import { useMemo, useState } from "react"
import { ConsolePageLayout } from "@/shared/console/layout"
import { ConsoleListPager } from "@/shared/console/list/pager"
import { useClientPagination } from "@/shared/console/list/pagination"
import { ActivityLog } from "@/shared/console/runs/activity"
import { ExecutionFilters } from "@/shared/console/runs/list/filters"
import { ExecutionRows } from "@/shared/console/runs/list/rows"
import { ApprovalCallout } from "@/shared/console/runs/request/approval"
import { OfferCallout } from "@/shared/console/runs/request/offer"
import { type RunRowSlots } from "@/shared/console/runs/row"
import { ExpandedExecution } from "@/shared/console/runs/row/expanded"
import { StopRunButton } from "@/shared/console/runs/row/stop"
import { useExecutionClock } from "@/shared/console/runs/time"
import { pageSize } from "@/shared/console/runs/types"
import { filterRuns, hasRunFilters, type RunFilters } from "../derive/runs"
import { type DemoActions } from "../state/actions"
import { type DemoState } from "../state/types"
import { useDemoWorkspace } from "../workspace"

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
  const now = useExecutionClock(state.runs)
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

/** The row slots over the workspace, held steady across ticks of the
 *  clock so a memoized row re-renders for its own run alone. */
function useRunRowSlots(actions: DemoActions, activity: DemoState["activity"]) {
  return useMemo<RunRowSlots>(
    () => ({
      expanded: (execution, now) => (
        <ExpandedExecution
          approvals={
            <ApprovalCallout
              approvals={execution.approvals}
              now={now}
              onDecide={(approval, decision) => {
                actions.decideApproval(execution.id, approval.id, decision)

                return Promise.resolve()
              }}
            />
          }
          execution={execution}
          log={<ActivityLog activity={activity[execution.id]} now={now} />}
          offers={
            <OfferCallout
              now={now}
              offers={execution.offers}
              onCancel={(offer) => {
                actions.settleOffer(execution.id, offer.id, "cancelled")

                return Promise.resolve()
              }}
              onClaim={() => Promise.resolve({ status: "connected" as const })}
            />
          }
        />
      ),
      stop: (execution) => (
        <StopRunButton
          onStop={() => {
            actions.stopRun(execution.id)

            return Promise.resolve()
          }}
        />
      ),
    }),
    [actions, activity]
  )
}
