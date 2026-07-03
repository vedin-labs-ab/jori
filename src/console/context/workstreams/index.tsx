import { useQuery } from "convex/react"
import { Layers } from "lucide-react"
import { useState } from "react"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "../../../../convex/_generated/api"
import { ContextSectionTitle } from "../section"
import { WorkstreamActions } from "./actions"
import { type Workstream, WorkstreamCard, type Workstreams } from "./card"
import { WorkstreamDetail } from "./detail"
import { MergeDialog } from "./merge"
import { RenameDialog } from "./rename"

type StatusFilter = "active" | "closed" | "rejected"

const filterLabels: Record<StatusFilter, string> = {
  active: "Active",
  closed: "Closed",
  rejected: "Not workstreams",
}

// Milo's deduced picture of the org's active work: suggestions to review on
// top, the confirmed roster below. Corrections teach the judge.
export function ContextWorkstreams({ tenantId }: { tenantId: string }) {
  const result = useQuery(api.deduction.console.queries.list, { tenantId })
  const [filter, setFilter] = useState<StatusFilter>("active")
  const [openId, setOpenId] = useState<Workstream["id"] | null>(null)
  const [editing, setEditing] = useState<Workstream | null>(null)
  const [merging, setMerging] = useState<Workstream | null>(null)
  const workstreams = result?.workstreams ?? []
  const open = workstreams.find((row) => row.id === openId) ?? null

  const dialogs = (workstream: Workstream) => ({
    onOpen: () => setOpenId(workstream.id),
    onEdit: () => setEditing(workstream),
    onMerge: () => setMerging(workstream),
  })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <Select
          value={filter}
          onValueChange={(value) => setFilter(value as StatusFilter)}
        >
          <SelectTrigger size="sm">
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
      </div>
      {result === undefined ? (
        <Skeleton className="h-28 w-full" />
      ) : (
        <FilteredWorkstreams
          tenantId={tenantId}
          filter={filter}
          workstreams={workstreams}
          dialogs={dialogs}
        />
      )}
      <WorkstreamDetail
        tenantId={tenantId}
        workstream={open}
        onClose={() => setOpenId(null)}
        onEdit={() => setEditing(open)}
        onMerge={() => setMerging(open)}
      />
      <RenameDialog
        tenantId={tenantId}
        workstream={editing}
        onClose={() => setEditing(null)}
      />
      <MergeDialog
        tenantId={tenantId}
        workstream={merging}
        workstreams={workstreams}
        onClose={() => setMerging(null)}
      />
    </div>
  )
}

function FilteredWorkstreams({
  tenantId,
  filter,
  workstreams,
  dialogs,
}: {
  tenantId: string
  filter: StatusFilter
  workstreams: Workstreams
  dialogs: (workstream: Workstream) => {
    onOpen: () => void
    onEdit: () => void
    onMerge: () => void
  }
}) {
  const section = (rows: Workstreams, quickActions: boolean) => (
    <ul className="flex flex-col gap-2">
      {rows.map((workstream) => (
        <li key={workstream.id}>
          <WorkstreamCard
            workstream={workstream}
            onOpen={dialogs(workstream).onOpen}
            actions={
              quickActions ? (
                <WorkstreamActions
                  tenantId={tenantId}
                  workstream={workstream}
                  only={["confirm", "reject"]}
                  onEdit={dialogs(workstream).onEdit}
                  onMerge={dialogs(workstream).onMerge}
                />
              ) : undefined
            }
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
      section(rows, false)
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
          {section(suggested, true)}
        </section>
      )}
      {confirmed.length === 0 ? null : (
        <section className="flex flex-col gap-2">
          <ContextSectionTitle count={confirmed.length}>
            Confirmed
          </ContextSectionTitle>
          {section(confirmed, false)}
        </section>
      )}
    </div>
  )
}

function WorkstreamsEmpty({ description }: { description: string }) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Layers />
        </EmptyMedia>
        <EmptyTitle>No workstreams</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
