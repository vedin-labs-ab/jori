import { useQuery } from "convex/react"
import { Lock } from "lucide-react"
import { type ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
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
import { IntegrationChips } from "../../shared/logo/integration"
import { relativeTime, useNow } from "../../shared/time"
import { ContextSectionTitle } from "../section"
import { WorkstreamActions } from "./actions"
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
      <SheetContent className="flex w-full flex-col gap-0 data-[side=right]:sm:max-w-lg">
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
        <IntegrationChips integrations={workstream.sources} />
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
      {timeline.length === 0 ? null : (
        <Section title="Timeline">
          <WorkstreamTimeline items={timeline} now={now} tenantId={tenantId} />
        </Section>
      )}
    </>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <ContextSectionTitle>{title}</ContextSectionTitle>
      {children}
    </section>
  )
}
