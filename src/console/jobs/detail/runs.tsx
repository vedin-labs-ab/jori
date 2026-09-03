import { ConsoleListPager } from "@/shared/console/list/pager"
import { ExecutionRows } from "@/shared/console/runs/list/rows"
import { useExecutionClock } from "@/shared/console/runs/time"
import { useExecutionPagination } from "../../runs/list/pagination"
import { useRunRowSlots } from "../../runs/list/slots"

/** The job's runs, newest first, paged the way Activity is, each row
 *  opening in place to the same detail. */
export function JobRuns({
  jobId,
  organizationId,
}: {
  jobId: string
  organizationId: string
}) {
  const pagination = useExecutionPagination({
    approvalFilter: "any",
    audienceFilter: "all",
    jobId,
    organizationId,
    query: "",
    runFilter: "all",
  })
  const now = useExecutionClock(pagination.visibleRows)
  const slots = useRunRowSlots(organizationId)

  return (
    <>
      <ExecutionRows
        {...slots}
        hasFilters={false}
        isLoading={pagination.isLoadingFirstPage}
        now={now}
        rows={pagination.visibleRows}
        showAudience={false}
      />
      <ConsoleListPager pagination={pagination} />
    </>
  )
}
