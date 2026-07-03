import { integrationLabel } from "@contracts/integrations"
import { ChevronRight, Lock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { IntegrationLogo } from "../../shared/logo/integration"
import { relativeTime } from "../../shared/time"
import { statusVariants, type Workstream } from "./types"

// The whole card opens the detail sheet; every correction lives there. The
// chevron keeps its own column as the disclosure affordance.
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
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <div className="flex min-w-0 grow flex-col gap-2">
          <div className="flex flex-col gap-0.5">
            <div className="flex w-full items-center gap-2">
              <span className="truncate font-medium text-sm">
                {workstream.name}
              </span>
              <Badge variant={statusVariants[workstream.status]}>
                {workstream.statusLabel}
              </Badge>
              {workstream.locked ? (
                <Lock
                  aria-label="Protected"
                  className="size-3 shrink-0 text-muted-foreground"
                />
              ) : null}
            </div>
            <span className="text-muted-foreground text-xs">
              seen {relativeTime(workstream.seenAt, Date.now())}
            </span>
          </div>
          <p className="line-clamp-2 text-muted-foreground text-sm">
            {workstream.brief}
          </p>
          <div className="flex w-full flex-wrap items-center gap-2">
            {workstream.sources.map((source) => (
              <Badge key={source} variant="outline">
                <IntegrationLogo
                  className="size-3"
                  decorative
                  integration={source}
                />
                {integrationLabel(source)}
              </Badge>
            ))}
          </div>
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </button>
    </Card>
  )
}
