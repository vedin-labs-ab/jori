import { type Integration, integrationLabel } from "@contracts/integrations"
import { useQuery } from "convex/react"
import { ChevronDown, Lock } from "lucide-react"
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
import { SeparatorDot } from "../../shared/dot"
import { IntegrationLogo } from "../../shared/logo/integration"
import { Paged } from "../../shared/paging"
import { relativeTime } from "../../shared/time"
import { Timeline } from "../../shared/timeline"
import { ContextSectionTitle } from "../section"
import { WorkstreamActions } from "./actions"
import { WorkstreamStatusCue } from "./status"
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
  const detail = useQuery(api.deduction.console.queries.get, {
    tenantId,
    workstreamId: workstream.id,
  })

  return (
    <>
      <SheetHeader>
        <SheetTitle className="flex flex-wrap items-center gap-2">
          {workstream.name}
          <WorkstreamStatusCue workstream={workstream} />
        </SheetTitle>
        <SheetDescription>
          Seen {relativeTime(workstream.seenAt, Date.now())}
        </SheetDescription>
        {workstream.locked ? (
          <p className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <Lock className="size-3 shrink-0" />
            Protected: Milo won't rewrite this workstream.
          </p>
        ) : null}
      </SheetHeader>
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4">
        {detail === undefined ? (
          <Skeleton className="h-40 w-full" />
        ) : detail === null ? (
          <p className="text-muted-foreground text-sm">
            This workstream is no longer available.
          </p>
        ) : (
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
            <CollapsibleSection count={detail.sightings.length} title="Sources">
              <Paged items={detail.sightings}>
                {(visible) => (
                  <ul className="flex flex-col divide-y rounded-md border">
                    {visible.map((sighting) => (
                      <Sighting key={sighting.id} sighting={sighting} />
                    ))}
                  </ul>
                )}
              </Paged>
            </CollapsibleSection>
            {detail.history.length === 0 ? null : (
              <CollapsibleSection count={detail.history.length} title="History">
                <Timeline
                  entries={detail.history.map((entry) => ({
                    id: entry.id,
                    at: entry.createdAt,
                    content: entry.entry,
                  }))}
                  now={Date.now()}
                />
              </CollapsibleSection>
            )}
          </>
        )}
      </div>
      <SheetFooter className="border-t">
        <WorkstreamActions tenantId={tenantId} workstream={workstream} />
      </SheetFooter>
    </>
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

function CollapsibleSection({
  title,
  count,
  children,
}: {
  title: string
  count: number
  children: ReactNode
}) {
  return (
    <Collapsible>
      <CollapsibleTrigger className="group flex w-full items-center justify-between">
        <ContextSectionTitle count={count}>{title}</ContextSectionTitle>
        <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-1.5">{children}</CollapsibleContent>
    </Collapsible>
  )
}

type SightingRow = {
  integration: Integration | null
  kind: string
  why: string
  observedAt: number
  url?: string
}

// The whole row links out to the cited artifact when the source has one.
function Sighting({ sighting }: { sighting: SightingRow }) {
  const content = (
    <>
      <div className="flex w-full min-w-0 items-center gap-2">
        {sighting.integration === null ? null : (
          <IntegrationLogo decorative integration={sighting.integration} />
        )}
        <span className="font-medium text-sm">
          {sighting.integration === null
            ? "Removed tool"
            : integrationLabel(sighting.integration)}
        </span>
        <SeparatorDot className="shrink-0 text-muted-foreground/60" />
        <span className="min-w-0 truncate text-muted-foreground text-xs">
          {sighting.kind}
        </span>
        <span className="ml-auto shrink-0 text-muted-foreground text-xs">
          {relativeTime(sighting.observedAt, Date.now())}
        </span>
      </div>
      <p className="line-clamp-2 text-muted-foreground text-sm">
        {sighting.why}
      </p>
    </>
  )

  if (sighting.url === undefined) {
    return <li className="flex flex-col gap-0.5 p-3">{content}</li>
  }

  return (
    <li>
      <a
        href={sighting.url}
        target="_blank"
        rel="noreferrer"
        className="flex flex-col gap-0.5 p-3 transition-colors hover:bg-muted/50"
      >
        {content}
      </a>
    </li>
  )
}
