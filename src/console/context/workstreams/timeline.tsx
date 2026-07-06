import { useQuery } from "convex/react"
import { ChevronDown } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { api } from "../../../../convex/_generated/api"
import { SeparatorDot } from "../../shared/dot"
import { IntegrationLogoStack } from "../../shared/logo/integration"
import { Paged } from "../../shared/paging"
import { absoluteTime, relativeTime } from "../../shared/time"
import { ContextSectionTitle } from "../section"
import { groupByDay, type TimelineDay } from "./grouping"
import { Receipt } from "./receipt"

type TimelineItem = NonNullable<
  ReturnType<typeof useQuery<typeof api.deduction.console.queries.timeline>>
>[number]

// The workstream narrative as an index, not prose: one row per effort
// update — name, providers, receipt count, recency — expanding into the
// entry text and the receipts behind it. Day labels sit left of a shared
// rail; older updates page in below.
export function WorkstreamTimeline({
  tenantId,
  items,
  now,
}: {
  tenantId: string
  items: TimelineItem[]
  now: number
}) {
  return (
    <Paged initialCount={8} items={items} step={12}>
      {(visible, hiddenCount) => (
        <div className="flex flex-col">
          {groupByDay(visible, now).map((day, index, days) => (
            <DaySection
              continues={index < days.length - 1 || hiddenCount > 0}
              day={day}
              first={index === 0}
              key={day.key}
              now={now}
              tenantId={tenantId}
            />
          ))}
        </div>
      )}
    </Paged>
  )
}

function DaySection({
  day,
  tenantId,
  now,
  first,
  continues,
}: {
  day: TimelineDay<TimelineItem>
  tenantId: string
  now: number
  first: boolean
  continues: boolean
}) {
  return (
    <section className="flex gap-3">
      <h4 className="w-14 shrink-0 pt-3 text-right font-medium text-muted-foreground text-xs">
        {day.label}
      </h4>
      {/* The spacer above the dot doubles as the incoming rail segment, so
          the line stays unbroken from section to section. */}
      <div aria-hidden className="flex flex-col items-center">
        <span className={cn("h-4 w-px shrink-0", !first && "bg-border")} />
        <TimelineDot live={day.key === new Date(now).toDateString()} />
        {continues ? <span className="w-px grow bg-border" /> : null}
      </div>
      <div className={cn("min-w-0 flex-1 self-start", continues && "mb-4")}>
        <Paged initialCount={2} items={day.items}>
          {(visible) => (
            <ol className="flex flex-col divide-y overflow-hidden rounded-md border">
              {visible.map((item) => (
                <EntryRow
                  item={item}
                  key={item.id}
                  now={now}
                  tenantId={tenantId}
                />
              ))}
            </ol>
          )}
        </Paged>
      </div>
    </section>
  )
}

// The live dot pulses while the day is still recording; past days sit still.
function TimelineDot({ live }: { live: boolean }) {
  if (!live) {
    return (
      <span className="size-2 shrink-0 rounded-full bg-muted-foreground/40" />
    )
  }

  return (
    <span className="relative flex size-2 shrink-0">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60 motion-reduce:animate-none" />
      <span className="relative inline-flex size-2 rounded-full bg-primary" />
    </span>
  )
}

function EntryRow({
  item,
  tenantId,
  now,
}: {
  item: TimelineItem
  tenantId: string
  now: number
}) {
  return (
    <li>
      <Collapsible>
        <CollapsibleTrigger className="group flex w-full items-center gap-3 p-2.5">
          <span className="flex min-w-0 flex-1 flex-col gap-1 text-left">
            <span className="truncate font-medium text-sm">
              {item.effort === "" ? "Update" : item.effort}
            </span>
            <EntryMeta item={item} now={now} />
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground transition group-hover:text-foreground group-data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent className="flex flex-col gap-2.5 border-t bg-muted/30 p-2.5">
          <p className="text-sm">{item.entry}</p>
          {item.receipts === 0 ? null : (
            <EntryReceipts item={item} tenantId={tenantId} />
          )}
        </CollapsibleContent>
      </Collapsible>
    </li>
  )
}

// Each meta chunk keeps its separator and stays unbreakable. On narrow
// screens the receipt count moves to its own line under the providers and
// timestamp, so nothing wraps mid-phrase and lines never start with a dot.
function EntryMeta({ item, now }: { item: TimelineItem; now: number }) {
  const hasLogos = item.integrations.length > 0
  const hasReceipts = item.receipts > 0

  return (
    <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-muted-foreground text-xs">
      {hasLogos ? (
        <IntegrationLogoStack integrations={item.integrations} />
      ) : null}
      {hasReceipts ? (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap max-sm:order-last max-sm:w-full">
          {hasLogos ? (
            <SeparatorDot className="text-muted-foreground/60 max-sm:hidden" />
          ) : null}
          {item.receipts === 1 ? "1 receipt" : `${item.receipts} receipts`}
        </span>
      ) : null}
      <span
        className="inline-flex items-center gap-1.5 whitespace-nowrap"
        title={absoluteTime(item.observedAt)}
      >
        {hasLogos ? (
          <SeparatorDot className="text-muted-foreground/60" />
        ) : hasReceipts ? (
          <SeparatorDot className="text-muted-foreground/60 max-sm:hidden" />
        ) : null}
        {relativeTime(item.observedAt, now)}
      </span>
    </span>
  )
}

// Receipts mount only when a row is expanded, so the evidence loads on
// intent and stays one click behind the claim.
function EntryReceipts({
  item,
  tenantId,
}: {
  item: TimelineItem
  tenantId: string
}) {
  const receipts = useQuery(api.deduction.console.queries.receipts, {
    tenantId,
    effortId: item.effortId,
    passId: item.passId,
  })

  return (
    <div className="flex flex-col gap-1">
      <ContextSectionTitle count={item.receipts}>Receipts</ContextSectionTitle>
      {receipts === undefined ? (
        <Skeleton className="h-12 w-full" />
      ) : (
        <Paged initialCount={2} items={receipts}>
          {(visible) => (
            <ul className="flex flex-col divide-y">
              {visible.map((receipt) => (
                <Receipt key={receipt.id} receipt={receipt} />
              ))}
            </ul>
          )}
        </Paged>
      )}
    </div>
  )
}
