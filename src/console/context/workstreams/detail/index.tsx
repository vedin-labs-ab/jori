import { useQuery } from "convex/react"
import { Lock } from "lucide-react"
import { type ReactNode } from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { IntegrationChips } from "@/shared/logo/integration"
import { api } from "../../../../../convex/_generated/api"
import { relativeTime, useNow } from "../../../shared/time"
import { ContextSectionTitle } from "../../section"
import { WorkstreamStatusCue } from "../status"
import { type Workstream } from "../types"
import { WorkstreamActions } from "./actions"
import { WorkstreamTimeline } from "./timeline"

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
  const detail = useQuery(api.workstreams.queries.get, args)
  const timeline = useQuery(api.workstreams.queries.timeline, args)
  const now = useNow(30_000)

  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex flex-wrap items-center gap-2">
          <WorkstreamTitle
            aliases={
              detail === undefined || detail === null ? [] : detail.aliases
            }
            name={workstream.name}
          />
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

// Aliases live behind the title: a dotted underline cues that hovering the
// name reveals what else the workstream has been called.
function WorkstreamTitle({
  name,
  aliases,
}: {
  name: string
  aliases: string[]
}) {
  if (aliases.length === 0) {
    return name
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-default underline decoration-dotted decoration-muted-foreground/50 underline-offset-4">
          {name}
        </span>
      </TooltipTrigger>
      <TooltipContent>Also known as {aliases.join(", ")}</TooltipContent>
    </Tooltip>
  )
}

type Detail = NonNullable<
  ReturnType<typeof useQuery<typeof api.workstreams.queries.get>>
>
type TimelineItems = NonNullable<
  ReturnType<typeof useQuery<typeof api.workstreams.queries.timeline>>
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
