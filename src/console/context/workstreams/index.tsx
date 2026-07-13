import { useQuery } from "convex/react"
import { Layers } from "lucide-react"
import { useMemo, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "../../../../convex/_generated/api"
import { ConsoleFilterGroup, ConsoleFilterToggle } from "../../shared/layout"
import { FilterableEmptyState } from "../../shared/list/empty"
import { ConsoleListPager } from "../../shared/list/pager"
import {
  useClientPagination,
  useResettingSetter,
} from "../../shared/list/pagination"
import { ContextPage } from ".."
import { PulseSkeleton } from "./activity/lane"
import { WorkstreamsPulse } from "./activity/pulse"
import { WorkstreamCard } from "./card"
import { WorkstreamDetail } from "./detail"
import {
  filterWorkstreamsByView,
  hasWorkstreamFilters,
  type WorkstreamFilter,
  workstreamFilterOptions,
} from "./filter"
import { type Workstream, type Workstreams } from "./types"

// Milo's deduced picture of the org's work. Corrections teach the judge.
export function ContextWorkstreams() {
  return (
    <ContextPage tab="workstreams">
      {(tenantId) => <WorkstreamsView tenantId={tenantId} />}
    </ContextPage>
  )
}

function WorkstreamsView({ tenantId }: { tenantId: string }) {
  const result = useQuery(api.deduction.console.queries.list, { tenantId })
  const [openId, setOpenId] = useState<Workstream["id"] | null>(null)
  const workstreams = result?.workstreams ?? []
  const list = useWorkstreamPagination(workstreams, result !== undefined)
  const open = workstreams.find((row) => row.id === openId) ?? null
  const openWorkstream = (workstream: Workstream) => setOpenId(workstream.id)
  const roster = workstreams.filter(
    (row) => row.status === "confirmed" || row.status === "proposed"
  )

  return (
    <div className="flex flex-col gap-4 pb-4 md:pb-6">
      {result === undefined ? (
        <PulseSkeleton />
      ) : (
        <WorkstreamsPulse
          tenantId={tenantId}
          workstreams={roster}
          onOpen={openWorkstream}
        />
      )}
      <WorkstreamFilters filter={list.filter} onFilterChange={list.setFilter} />
      {result === undefined ? (
        <Skeleton className="h-28 w-full" />
      ) : (
        <WorkstreamList
          hasFilters={list.hasFilters || workstreams.length > 0}
          workstreams={list.pagination.visibleRows}
          onOpen={openWorkstream}
        />
      )}
      {list.total > 0 ? (
        <ConsoleListPager pagination={list.pagination} />
      ) : null}
      <WorkstreamDetail
        tenantId={tenantId}
        workstream={open}
        onClose={() => setOpenId(null)}
      />
    </div>
  )
}

function useWorkstreamPagination(workstreams: Workstreams, isReady: boolean) {
  const [filter, setFilter] = useState<WorkstreamFilter>("active")
  const filteredWorkstreams = useMemo(
    () => filterWorkstreamsByView(workstreams, filter),
    [filter, workstreams]
  )
  const hasFilters = hasWorkstreamFilters(filter)
  const pagination = useClientPagination({
    hasFilters,
    isReady,
    itemLabel: { singular: "workstream", plural: "workstreams" },
    items: filteredWorkstreams,
  })
  const setFilterAndReset = useResettingSetter(setFilter, pagination.reset)

  return {
    filter,
    hasFilters,
    pagination,
    setFilter: setFilterAndReset,
    total: filteredWorkstreams.length,
  }
}

function WorkstreamFilters({
  filter,
  onFilterChange,
}: {
  filter: WorkstreamFilter
  onFilterChange: (value: WorkstreamFilter) => void
}) {
  return (
    <ConsoleFilterGroup>
      <ConsoleFilterToggle
        label="Status"
        onValueChange={onFilterChange}
        options={workstreamFilterOptions}
        value={filter}
      />
    </ConsoleFilterGroup>
  )
}

function WorkstreamList({
  hasFilters,
  workstreams,
  onOpen,
}: {
  hasFilters: boolean
  workstreams: Workstreams
  onOpen: (workstream: Workstream) => void
}) {
  if (workstreams.length === 0) {
    return (
      <FilterableEmptyState
        description="Milo reviews activity across your connected tools every hour; suggested workstreams appear here."
        hasFilters={hasFilters}
        icon={Layers}
        noun="workstreams"
      />
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {workstreams.map((workstream) => (
        <li key={workstream.id}>
          <WorkstreamCard
            workstream={workstream}
            onOpen={() => onOpen(workstream)}
          />
        </li>
      ))}
    </ul>
  )
}
