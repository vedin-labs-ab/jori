import { type useQuery } from "convex/react"
import { Lock } from "lucide-react"
import { type ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { type api } from "../../../../convex/_generated/api"
import { relativeTime } from "../../shared/time"

export type Workstreams = NonNullable<
  ReturnType<typeof useQuery<typeof api.deduction.console.queries.list>>
>["workstreams"]
export type Workstream = Workstreams[number]

const statusVariants: Record<
  Workstream["status"],
  "default" | "secondary" | "outline"
> = {
  proposed: "default",
  confirmed: "secondary",
  closed: "outline",
  rejected: "outline",
}

export function WorkstreamCard({
  workstream,
  onOpen,
  actions,
}: {
  workstream: Workstream
  onOpen: () => void
  actions?: ReactNode
}) {
  return (
    <Card className="py-4">
      <CardContent className="flex flex-col gap-2 px-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="font-medium text-sm hover:underline"
            onClick={onOpen}
          >
            {workstream.name}
          </button>
          <Badge variant={statusVariants[workstream.status]}>
            {workstream.statusLabel}
          </Badge>
          {workstream.locked ? (
            <Lock
              aria-label="Protected"
              className="size-3 text-muted-foreground"
            />
          ) : null}
        </div>
        <p className="text-muted-foreground text-sm">{workstream.brief}</p>
        <div className="flex flex-wrap items-center gap-2">
          {workstream.sources.map((source) => (
            <Badge key={source} variant="outline">
              {source}
            </Badge>
          ))}
          <span className="text-muted-foreground text-xs">
            seen {relativeTime(workstream.seenAt, Date.now())}
          </span>
          {actions === undefined ? null : (
            <div className="ml-auto">{actions}</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
