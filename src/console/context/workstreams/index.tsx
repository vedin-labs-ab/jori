import { useQuery } from "convex/react"
import { Layers } from "lucide-react"
import { useState } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "../../../../convex/_generated/api"
import { ConsoleFilterField } from "../../shared/layout"
import { ConsoleEmptyState } from "../../shared/list/empty"
import { ContextPage } from ".."
import { ContextSectionTitle } from "../section"
import { WorkstreamCard } from "./card"
import { WorkstreamDetail } from "./detail"
import { WorkstreamsPulse } from "./pulse"
import { type Workstream, type Workstreams } from "./types"

type StatusFilter = "active" | "closed" | "rejected"

const filterLabels: Record<StatusFilter, string> = {
  active: "Active",
  closed: "Archived",
  rejected: "Not workstreams",
}

// Milo's deduced picture of the org's active work: suggestions to review on
// top, the confirmed roster below. Corrections teach the judge.
export function ContextWorkstreams() {
  return (
    <ContextPage tab="workstreams">
      {(tenantId) => <WorkstreamsView tenantId={tenantId} />}
    </ContextPage>
  )
}

function WorkstreamsView({ tenantId }: { tenantId: string }) {
  const result = useQuery(api.deduction.console.queries.list, { tenantId })
  const [filter, setFilter] = useState<StatusFilter>("active")
  const [openId, setOpenId] = useState<Workstream["id"] | null>(null)
  const workstreams = result?.workstreams ?? []
  const open = workstreams.find((row) => row.id === openId) ?? null
  const openWorkstream = (workstream: Workstream) => setOpenId(workstream.id)
  const roster = workstreams.filter(
    (row) => row.status === "confirmed" || row.status === "proposed"
  )

  return (
    <div className="flex flex-col gap-4">
      {result === undefined ? null : (
        <WorkstreamsPulse
          tenantId={tenantId}
          workstreams={roster}
          onOpen={openWorkstream}
        />
      )}
      <div className="flex items-center justify-between gap-2">
        <ConsoleFilterField label="Status">
          <Select
            value={filter}
            onValueChange={(value) => setFilter(value as StatusFilter)}
          >
            <SelectTrigger size="sm" className="w-fit">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(filterLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ConsoleFilterField>
      </div>
      {result === undefined ? (
        <Skeleton className="h-28 w-full" />
      ) : (
        <FilteredWorkstreams
          filter={filter}
          workstreams={workstreams}
          onOpen={openWorkstream}
        />
      )}
      <WorkstreamDetail
        tenantId={tenantId}
        workstream={open}
        onClose={() => setOpenId(null)}
      />
    </div>
  )
}

function FilteredWorkstreams({
  filter,
  workstreams,
  onOpen,
}: {
  filter: StatusFilter
  workstreams: Workstreams
  onOpen: (workstream: Workstream) => void
}) {
  const section = (rows: Workstreams) => (
    <ul className="flex flex-col gap-2">
      {rows.map((workstream) => (
        <li key={workstream.id}>
          <WorkstreamCard
            workstream={workstream}
            onOpen={() => onOpen(workstream)}
          />
        </li>
      ))}
    </ul>
  )

  if (filter !== "active") {
    const rows = workstreams.filter((row) => row.status === filter)

    return rows.length === 0 ? (
      <WorkstreamsEmpty
        description={`Nothing ${filterLabels[filter].toLowerCase()} yet.`}
      />
    ) : (
      section(rows)
    )
  }

  const suggested = workstreams.filter((row) => row.status === "proposed")
  const confirmed = workstreams.filter((row) => row.status === "confirmed")

  if (suggested.length === 0 && confirmed.length === 0) {
    return (
      <WorkstreamsEmpty description="Milo reviews activity across your connected tools every hour; suggested workstreams appear here." />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {suggested.length === 0 ? null : (
        <section className="flex flex-col gap-2">
          <ContextSectionTitle count={suggested.length}>
            Needs review
          </ContextSectionTitle>
          {section(suggested)}
        </section>
      )}
      {confirmed.length === 0 ? null : (
        <section className="flex flex-col gap-2">
          <ContextSectionTitle count={confirmed.length}>
            Confirmed
          </ContextSectionTitle>
          {section(confirmed)}
        </section>
      )}
    </div>
  )
}

function WorkstreamsEmpty({ description }: { description: string }) {
  return (
    <ConsoleEmptyState
      description={description}
      icon={Layers}
      title="No workstreams"
    />
  )
}
