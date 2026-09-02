import { Link } from "@tanstack/react-router"
import { useQuery } from "convex/react"
import { Cable, Layers } from "lucide-react"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { countActiveFilters } from "@/shared/console/filters/count"
import { ConsoleFilterToggle } from "@/shared/console/filters/field"
import { ConsoleFiltered } from "@/shared/console/filters/layout"
import { FilterableEmptyState } from "@/shared/console/list/empty"
import { ConsoleListLoading } from "@/shared/console/list/loading"
import { ConsoleListPager } from "@/shared/console/list/pager"
import {
  useClientPagination,
  useResettingSetter,
} from "@/shared/console/list/pagination"
import { api } from "../../../../convex/_generated/api"
import { ConsolePage } from "../../page"
import { ContextLayout } from ".."
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

// Jori's deduced picture of the org's work. Corrections teach the judge.
export function ContextWorkstreams() {
  return (
    <ConsolePage>
      {(organizationId) => <WorkstreamsView organizationId={organizationId} />}
    </ConsolePage>
  )
}

function WorkstreamsView({ organizationId }: { organizationId: string }) {
  const result = useQuery(api.workstreams.queries.list, { organizationId })
  const [openId, setOpenId] = useState<Workstream["id"] | null>(null)
  const workstreams = result?.workstreams ?? []
  const list = useWorkstreamPagination(workstreams, result !== undefined)
  const open = workstreams.find((row) => row.id === openId) ?? null
  const openWorkstream = (workstream: Workstream) => setOpenId(workstream.id)
  const roster = workstreams.filter(
    (row) => row.status === "confirmed" || row.status === "proposed"
  )

  return (
    <ConsoleFiltered
      activeCount={countActiveFilters(list.hasFilters)}
      onReset={() => list.setFilter(defaultWorkstreamFilter)}
      panel={
        <ConsoleFilterToggle
          label="Status"
          onValueChange={list.setFilter}
          options={workstreamFilterOptions}
          value={list.filter}
        />
      }
    >
      <ContextLayout tab="workstreams">
        <div className="flex flex-col gap-4 pb-4 md:pb-6">
          {result === undefined ? (
            <PulseSkeleton />
          ) : (
            <WorkstreamsPulse
              organizationId={organizationId}
              workstreams={roster}
              onOpen={openWorkstream}
            />
          )}
          {result === undefined ? (
            <ConsoleListLoading />
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
            organizationId={organizationId}
            workstream={open}
            onClose={() => setOpenId(null)}
          />
        </div>
      </ContextLayout>
    </ConsoleFiltered>
  )
}

const defaultWorkstreamFilter: WorkstreamFilter = "active"

function useWorkstreamPagination(workstreams: Workstreams, isReady: boolean) {
  const [filter, setFilter] = useState<WorkstreamFilter>(
    defaultWorkstreamFilter
  )
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
        // Workstreams are deduced from activity, not created by hand, so
        // the closest primary action is connecting the tools they come from.
        action={
          <Button asChild variant="outline">
            <Link to="/integrations">
              <Cable />
              Connect integrations
            </Link>
          </Button>
        }
        description="Jori reviews activity across your connected tools every hour; suggested workstreams appear here."
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
