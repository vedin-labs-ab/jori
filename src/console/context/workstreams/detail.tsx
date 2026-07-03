import { type Integration, integrationLabel } from "@contracts/integrations"
import { useQuery } from "convex/react"
import { ExternalLink, Lock, ShieldCheck } from "lucide-react"
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
import { IntegrationLogo } from "../../shared/logo/integration"
import { relativeTime } from "../../shared/time"
import { Timeline, TimelineItem } from "../../shared/timeline"
import { ContextSectionTitle } from "../section"
import { WorkstreamActions } from "./actions"
import { statusVariants, type Workstream } from "./types"

export function WorkstreamDetail({
  tenantId,
  workstream,
  onClose,
  onEdit,
  onMerge,
}: {
  tenantId: string
  workstream: Workstream | null
  onClose: () => void
  onEdit: () => void
  onMerge: () => void
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
          <DetailBody
            tenantId={tenantId}
            workstream={workstream}
            onEdit={onEdit}
            onMerge={onMerge}
          />
        )}
      </SheetContent>
    </Sheet>
  )
}

function DetailBody({
  tenantId,
  workstream,
  onEdit,
  onMerge,
}: {
  tenantId: string
  workstream: Workstream
  onEdit: () => void
  onMerge: () => void
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
          <Badge variant={statusVariants[workstream.status]}>
            {workstream.statusLabel}
          </Badge>
        </SheetTitle>
        <SheetDescription>
          Seen {relativeTime(workstream.seenAt, Date.now())}
        </SheetDescription>
        {workstream.locked ? (
          <p className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <Lock className="size-3 shrink-0" />
            Protected: you edited this, so Milo won't rewrite it.
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
            {workstream.status === "proposed" ? (
              <SupportNote support={detail.support} />
            ) : null}
            <Section title="Brief">
              <p className="text-sm">{detail.brief}</p>
            </Section>
            <Section title="Sources" count={detail.sightings.length}>
              <ul className="flex flex-col divide-y rounded-md border">
                {detail.sightings.map((sighting) => (
                  <Sighting key={sighting.id} sighting={sighting} />
                ))}
              </ul>
            </Section>
            {detail.history.length === 0 ? null : (
              <Section title="History">
                <Timeline>
                  {detail.history.map((entry) => (
                    <TimelineItem
                      key={entry.id}
                      time={relativeTime(entry.createdAt, Date.now())}
                    >
                      {entry.entry}
                    </TimelineItem>
                  ))}
                </Timeline>
              </Section>
            )}
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
          </>
        )}
      </div>
      <SheetFooter className="border-t">
        <WorkstreamActions
          tenantId={tenantId}
          workstream={workstream}
          onEdit={onEdit}
          onMerge={onMerge}
        />
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

function SupportNote({
  support,
}: {
  support: { sources: Integration[]; meetsThreshold: boolean }
}) {
  const sources = support.sources.map(integrationLabel).join(" and ")

  return (
    <div className="flex items-start gap-2 rounded-md border bg-muted/30 p-3 text-sm">
      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <p>
        {support.meetsThreshold
          ? `Support spans ${sources}. Milo can confirm this on its next review, or you can confirm it now.`
          : `Seen in ${sources} so far. Milo suggests confirming once support spans multiple tools or several days.`}
      </p>
    </div>
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
      <div className="flex w-full items-center gap-2">
        {sighting.integration === null ? null : (
          <IntegrationLogo decorative integration={sighting.integration} />
        )}
        <span className="font-medium text-sm">
          {sighting.integration === null
            ? "Removed tool"
            : integrationLabel(sighting.integration)}
        </span>
        <span className="text-muted-foreground text-xs">{sighting.kind}</span>
        <span className="ml-auto text-muted-foreground text-xs">
          {relativeTime(sighting.observedAt, Date.now())}
        </span>
        {sighting.url === undefined ? null : (
          <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
        )}
      </div>
      <p className="text-muted-foreground text-sm">{sighting.why}</p>
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
