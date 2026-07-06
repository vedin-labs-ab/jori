import { ChevronRight, Lock } from "lucide-react"
import { Card } from "@/components/ui/card"
import { IntegrationChips } from "../../shared/logo/integration"
import { WorkstreamStatusCue } from "./status"
import { type Workstream } from "./types"

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
          <div className="flex w-full items-center gap-2">
            <span className="truncate font-medium text-sm">
              {workstream.name}
            </span>
            <WorkstreamStatusCue workstream={workstream} />
            {workstream.locked ? (
              <Lock
                aria-label="Protected"
                className="size-3 shrink-0 text-muted-foreground"
              />
            ) : null}
          </div>
          <p className="line-clamp-2 text-muted-foreground text-sm">
            {workstream.brief}
          </p>
          <IntegrationChips integrations={workstream.sources} />
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </button>
    </Card>
  )
}
