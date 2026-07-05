import { usePaginatedQuery, useQuery } from "convex/react"
import { ChevronRight, Lock } from "lucide-react"
import { type ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "../../../../convex/_generated/api"
import { Paged, PagedRemote } from "../../shared/paging"
import { relativeTime, useNow } from "../../shared/time"
import { ContextSectionTitle } from "../section"
import { WorkstreamActions } from "./actions"
import { Sighting } from "./sighting"
import { WorkstreamStatusCue } from "./status"
import { WorkstreamTimeline } from "./timeline"
import { type Workstream } from "./types"

export function WorkstreamDetail({
  tenantId,
  workstream,
  onClose,
}: {
  tenantId: string
  workstream: Workstream | null
  onClose: () => void
}) {
  return (
    <Sheet
      open={workstream !== null}
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
    >
      <SheetContent className="flex w-full flex-col gap-0 sm:max-w-lg">
        {workstream === null ? null : (
          <DetailBody tenantId={tenantId} workstream={workstream} />
        )}
      </SheetContent>
    </Sheet>
  )
}

function DetailBody({
  tenantId,
  workstream,
}: {
  tenantId: string
  workstream: Workstream
}) {
  const args = { tenantId, workstreamId: workstream.id }
  const detail = useQuery(api.deduction.console.queries.get, args)
  const timeline = useQuery(api.deduction.console.queries.timeline, args)
  const now = useNow(30_000)

  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex flex-wrap items-center gap-2">
          {workstream.name}
          <WorkstreamStatusCue workstream={workstream} />
        </SheetTitle>
        <SheetDescription>
          Seen {relativeTime(workstream.seenAt, now)}
        </SheetDescription>
        {workstream.locked ? (
          <p className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <Lock className="size-3 shrink-0" />
            Protected: Milo won't rewrite this workstream.
          </p>
        ) : null}
      </SheetHeader>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
        {detail === undefined || timeline === undefined ? (
          <Skeleton className="h-40 w-full" />
        ) : detail === null ? (
          <p className="text-muted-foreground text-sm">
            This workstream is no longer available.
          </p>
        ) : (
          <DetailSections
            detail={detail}
            now={now}
            tenantId={tenantId}
            timeline={timeline}
          />
        )}
      </div>
      <SheetFooter className="border-t">
        <WorkstreamActions tenantId={tenantId} workstream={workstream} />
      </SheetFooter>
    </>
  )
}

type Detail = NonNullable<
  ReturnType<typeof useQuery<typeof api.deduction.console.queries.get>>
>
type TimelineItems = NonNullable<
  ReturnType<typeof useQuery<typeof api.deduction.console.queries.timeline>>
>

function DetailSections({
  detail,
  timeline,
  tenantId,
  now,
}: {
  detail: Detail
  timeline: TimelineItems
  tenantId: string
  now: number
}) {
  return (
    <>
      <Section title="Brief">
        <p className="text-sm">{detail.brief}</p>
      </Section>
      {detail.aliases.length === 0 ? null : (
        <Section title="Also known as">
          <div className="flex flex-wrap gap-2">
            {detail.aliases.map((alias) => (
              <Badge key={alias} variant="outline">
                {alias}
              </Badge>
            ))}
          </div>
        </Section>
      )}
      {detail.efforts.length === 0 ? null : (
        <Section count={detail.efforts.length} title="Efforts">
          <Paged initialCount={4} items={detail.efforts}>
            {(visible) => (
              <ul className="flex flex-col divide-y rounded-md border">
                {visible.map((effort) => (
                  <li className="flex flex-col gap-0.5 p-3" key={effort.id}>
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="min-w-0 truncate font-medium text-sm">
                        {effort.name}
                      </span>
                      <span className="ml-auto shrink-0 text-muted-foreground text-xs">
                        {relativeTime(effort.seenAt, now)}
                      </span>
                    </span>
                    <span className="truncate text-muted-foreground text-sm">
                      {effort.summary}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Paged>
        </Section>
      )}
      {timeline.length === 0 ? null : (
        <Section count={timeline.length} title="Timeline">
          <WorkstreamTimeline items={timeline} now={now} tenantId={tenantId} />
        </Section>
      )}
      <AllSources
        count={detail.counts.sightings}
        tenantId={tenantId}
        workstreamId={detail.id}
      />
    </>
  )
}

// The audit view: every source sighting behind the workstream, tucked behind
// one disclosure. Day-to-day verification lives on the timeline entries.
function AllSources({
  tenantId,
  workstreamId,
  count,
}: {
  tenantId: string
  workstreamId: Detail["id"]
  count: number
}) {
  const sightings = usePaginatedQuery(
    api.deduction.console.queries.sightings,
    { tenantId, workstreamId },
    { initialNumItems: 5 }
  )

  if (count === 0) {
    return null
  }

  return (
    <Collapsible>
      <CollapsibleTrigger className="group flex w-full items-center justify-between">
        <ContextSectionTitle count={count}>All sources</ContextSectionTitle>
        <ChevronRight className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-90" />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-1.5">
        <PagedRemote
          canLoadMore={sightings.status === "CanLoadMore"}
          isLoading={sightings.status === "LoadingMore"}
          loaded={sightings.results.length}
          onLoadMore={(loadCount) => sightings.loadMore(loadCount)}
          total={count}
        >
          <ul className="flex flex-col divide-y rounded-md border">
            {sightings.results.map((sighting) => (
              <Sighting key={sighting.id} sighting={sighting} />
            ))}
          </ul>
        </PagedRemote>
      </CollapsibleContent>
    </Collapsible>
  )
}

function Section({
  title,
  count,
  children,
}: {
  title: string
  count?: number
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-1.5">
      <ContextSectionTitle count={count}>{title}</ContextSectionTitle>
      {children}
    </section>
  )
}
