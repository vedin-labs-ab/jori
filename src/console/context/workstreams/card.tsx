import { integrationLabel } from "@contracts/integrations"
import { ChevronRight, Lock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { IntegrationLogo } from "../../shared/logo/integration"
import { relativeTime } from "../../shared/time"
import { statusVariants, type Workstream } from "./types"

// The whole card opens the detail sheet; every correction lives there.
export function WorkstreamCard({
  workstream,
  onOpen,
}: {
  workstream: Workstream
  onOpen: () => void
}) {
  return (
    <Card className="py-0 transition-colors hover:bg-muted/50">
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full flex-col gap-2 p-4 text-left"
      >
        <div className="flex w-full items-center gap-2">
          <span className="font-medium text-sm">{workstream.name}</span>
          <Badge variant={statusVariants[workstream.status]}>
            {workstream.statusLabel}
          </Badge>
          {workstream.locked ? (
            <Lock
              aria-label="Protected"
              className="size-3 text-muted-foreground"
            />
          ) : null}
          <ChevronRight className="ml-auto size-4 shrink-0 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-sm">{workstream.brief}</p>
        <div className="flex w-full flex-wrap items-center gap-2">
          {workstream.sources.map((source) => (
            <Badge key={source} variant="outline">
              <IntegrationLogo decorative integration={source} />
              {integrationLabel(source)}
            </Badge>
          ))}
          <span className="ml-auto text-muted-foreground text-xs">
            seen {relativeTime(workstream.seenAt, Date.now())}
          </span>
        </div>
      </button>
    </Card>
  )
}
