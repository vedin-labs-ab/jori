import { useQuery } from "convex/react"
import { CalendarDays, ChevronDown } from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "../../../../convex/_generated/api"
import { TimelineRow } from "../../shared/timeline"

type TimelineItem = NonNullable<
  ReturnType<typeof useQuery<typeof api.deduction.console.queries.timeline>>
>[number]

import { groupTimeline, type TimelineSection } from "./grouping"
import { Sighting } from "./sighting"

// The workstream narrative with tiered disclosure: the last week stays open
// under day headers, older activity collapses into week and month groups,
// and every entry expands into the receipts behind the claim.
export function WorkstreamTimeline({
  tenantId,
  items,
  now,
}: {
  tenantId: string
  items: TimelineItem[]
  now: number
}) {
  const sections = groupTimeline(items, now)

  return (
    <div className="flex flex-col gap-3">
      {sections.map((section) =>
        section.tier === "day" ? (
          <DaySection
            key={section.key}
            now={now}
            section={section}
            tenantId={tenantId}
          />
        ) : (
          <GroupSection
            key={section.key}
            now={now}
            section={section}
            tenantId={tenantId}
          />
        )
      )}
    </div>
  )
}

type Section = TimelineSection<TimelineItem>

function DaySection({
  section,
  tenantId,
  now,
}: {
  section: Section
  tenantId: string
  now: number
}) {
  return (
    <section className="flex flex-col gap-1.5">
      <h4 className="font-medium text-muted-foreground text-xs">
        {section.label}
      </h4>
      <Entries now={now} items={section.items} tenantId={tenantId} />
    </section>
  )
}

// Older tiers read as a single collapsed line until asked: a mechanical
// header of counts and effort names, never a synthesized summary.
function GroupSection({
  section,
  tenantId,
  now,
}: {
  section: Section
  tenantId: string
  now: number
}) {
  return (
    <Collapsible className="rounded-md border">
      <CollapsibleTrigger className="group flex w-full items-center gap-2 p-3 text-sm">
        <CalendarDays aria-hidden className="size-4 text-muted-foreground" />
        <span className="font-medium">{section.label}</span>
        <span className="min-w-0 truncate text-muted-foreground text-xs">
          {section.meta}
        </span>
        <ChevronDown className="ml-auto size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3">
        <Entries now={now} items={section.items} tenantId={tenantId} />
      </CollapsibleContent>
    </Collapsible>
  )
}

function Entries({
  items,
  tenantId,
  now,
}: {
  items: TimelineItem[]
  tenantId: string
  now: number
}) {
  return (
    <ol className="flex flex-col">
      {items.map((item, index) => (
        <TimelineRow
          at={item.observedAt}
          continues={index < items.length - 1}
          key={item.id}
          label={
            item.effort === "" ? undefined : (
              <Badge className="min-w-0" variant="outline">
                <span className="truncate">{item.effort}</span>
              </Badge>
            )
          }
          details={
            item.receipts === 0 ? undefined : (
              <Receipts item={item} tenantId={tenantId} />
            )
          }
          now={now}
        >
          {item.entry}
        </TimelineRow>
      ))}
    </ol>
  )
}

// Receipts load only when asked for: the claim stays primary, the evidence
// one click away.
function Receipts({
  item,
  tenantId,
}: {
  item: TimelineItem
  tenantId: string
}) {
  const [open, setOpen] = useState(false)
  const receipts = useQuery(
    api.deduction.console.queries.receipts,
    open ? { tenantId, effortId: item.effortId, passId: item.passId } : "skip"
  )

  return (
    <div className="flex flex-col gap-1">
      <Button
        className="-ml-2 w-fit text-muted-foreground"
        onClick={() => setOpen((value) => !value)}
        size="sm"
        type="button"
        variant="link"
      >
        {item.receipts === 1 ? "1 source" : `${item.receipts} sources`}
        <ChevronDown
          className={
            open ? "rotate-180 transition-transform" : "transition-transform"
          }
        />
      </Button>
      {!open ? null : receipts === undefined ? (
        <Skeleton className="h-12 w-full" />
      ) : (
        <ul className="flex flex-col divide-y rounded-md border">
          {receipts.map((receipt) => (
            <Sighting key={receipt.id} sighting={receipt} />
          ))}
        </ul>
      )}
    </div>
  )
}
