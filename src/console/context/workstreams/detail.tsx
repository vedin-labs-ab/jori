import { useQuery } from "convex/react"
import { ExternalLink, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "../../../../convex/_generated/api"
import { relativeTime } from "../../shared/time"
import { ContextSectionTitle } from "../section"
import { WorkstreamActions } from "./actions"
import { type Workstream } from "./card"

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
    <Dialog
      open={workstream !== null}
      onOpenChange={(open) => {
        if (!open) {
          onClose()
        }
      }}
    >
      <DialogContent className="sm:max-w-xl">
        {workstream === null ? null : (
          <DetailBody
            tenantId={tenantId}
            workstream={workstream}
            onEdit={onEdit}
            onMerge={onMerge}
          />
        )}
      </DialogContent>
    </Dialog>
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
    <div className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="flex flex-wrap items-center gap-2">
          {workstream.name}
          <Badge variant="secondary">{workstream.statusLabel}</Badge>
        </DialogTitle>
        <DialogDescription>
          Seen {relativeTime(workstream.seenAt, Date.now())}
          {workstream.locked
            ? " · Protected: you edited this, so Milo won't rewrite it."
            : ""}
        </DialogDescription>
      </DialogHeader>
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
          <section className="flex flex-col gap-1.5">
            <ContextSectionTitle>Brief</ContextSectionTitle>
            <p className="text-sm">{detail.brief}</p>
          </section>
          <section className="flex flex-col gap-1.5">
            <ContextSectionTitle count={detail.sightings.length}>
              Sources
            </ContextSectionTitle>
            <ul className="flex flex-col divide-y rounded-md border">
              {detail.sightings.map((sighting) => (
                <Sighting key={sighting.id} sighting={sighting} />
              ))}
            </ul>
          </section>
          {detail.history.length === 0 ? null : (
            <section className="flex flex-col gap-1.5">
              <ContextSectionTitle>History</ContextSectionTitle>
              <ul className="flex flex-col gap-2">
                {detail.history.map((entry) => (
                  <li key={entry.id} className="text-sm">
                    <span className="text-muted-foreground text-xs">
                      {relativeTime(entry.createdAt, Date.now())}
                    </span>
                    <p>{entry.entry}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {detail.aliases.length === 0 ? null : (
            <section className="flex flex-col gap-1.5">
              <ContextSectionTitle>Also known as</ContextSectionTitle>
              <div className="flex flex-wrap gap-2">
                {detail.aliases.map((alias) => (
                  <Badge key={alias} variant="outline">
                    {alias}
                  </Badge>
                ))}
              </div>
            </section>
          )}
          <div className="flex flex-col gap-2 border-t pt-3">
            <WorkstreamActions
              tenantId={tenantId}
              workstream={workstream}
              onEdit={onEdit}
              onMerge={onMerge}
            />
            <p className="text-muted-foreground text-xs">
              Confirmed workstreams help Milo answer with your organization's
              context.
            </p>
          </div>
        </>
      )}
    </div>
  )
}

function SupportNote({
  support,
}: {
  support: { sources: string[]; meetsThreshold: boolean }
}) {
  const sources = support.sources.join(" and ")

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

function Sighting({
  sighting,
}: {
  sighting: {
    source: string
    kind: string
    why: string
    observedAt: number
    url?: string
  }
}) {
  return (
    <li className="flex flex-col gap-0.5 p-3">
      <div className="flex items-center gap-2">
        <span className="font-medium text-sm">{sighting.source}</span>
        <span className="text-muted-foreground text-xs">{sighting.kind}</span>
        <span className="ml-auto text-muted-foreground text-xs">
          {relativeTime(sighting.observedAt, Date.now())}
        </span>
        {sighting.url === undefined ? null : (
          <a
            href={sighting.url}
            target="_blank"
            rel="noreferrer"
            aria-label="Open source"
            className="text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="size-3.5" />
          </a>
        )}
      </div>
      <p className="text-muted-foreground text-sm">{sighting.why}</p>
    </li>
  )
}
