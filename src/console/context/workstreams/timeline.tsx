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
  continues,
}: {
  day: TimelineDay<TimelineItem>
  tenantId: string
  now: number
  continues: boolean
}) {
  return (
    <section className="flex gap-3">
      <h4 className="w-14 shrink-0 pt-3 text-right font-medium text-muted-foreground text-xs">
        {day.label}
      </h4>
      <div aria-hidden className="flex flex-col items-center">
        <span className="mt-4 size-2 shrink-0 rounded-full bg-muted-foreground/40" />
        {continues ? <span className="w-px grow bg-border" /> : null}
      </div>
      <ol
        className={cn(
          "flex min-w-0 flex-1 flex-col divide-y self-start rounded-md border",
          continues && "mb-4"
        )}
      >
        {day.items.map((item) => (
          <EntryRow item={item} key={item.id} now={now} tenantId={tenantId} />
        ))}
      </ol>
    </section>
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
        <CollapsibleTrigger className="group flex w-full items-center gap-2 p-3">
          <span className="min-w-0 truncate text-left font-medium text-sm">
            {item.effort === "" ? "Update" : item.effort}
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-1.5 text-muted-foreground text-xs">
            {item.integrations.length === 0 ? null : (
              <>
                <IntegrationLogoStack integrations={item.integrations} />
                <SeparatorDot className="text-muted-foreground/60" />
              </>
            )}
            {item.receipts === 0 ? null : (
              <>
                <span>
                  {item.receipts === 1
                    ? "1 receipt"
                    : `${item.receipts} receipts`}
                </span>
                <SeparatorDot className="text-muted-foreground/60" />
              </>
            )}
            <span title={absoluteTime(item.observedAt)}>
              {relativeTime(item.observedAt, now)}
            </span>
            <ChevronDown className="size-4 transition-transform group-data-[state=open]:rotate-180" />
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent className="flex flex-col gap-3 px-3 pb-3">
          <p className="text-sm">{item.entry}</p>
          {item.receipts === 0 ? null : (
            <EntryReceipts item={item} tenantId={tenantId} />
          )}
        </CollapsibleContent>
      </Collapsible>
    </li>
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
      <h5 className="font-medium text-muted-foreground text-xs">Receipts</h5>
      {receipts === undefined ? (
        <Skeleton className="h-12 w-full" />
      ) : (
        <ul className="flex flex-col divide-y">
          {receipts.map((receipt) => (
            <Receipt key={receipt.id} receipt={receipt} />
          ))}
        </ul>
      )}
    </div>
  )
}
