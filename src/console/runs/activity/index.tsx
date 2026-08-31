import { useQuery } from "convex/react"
import { Logs } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { countLabel } from "@/lib/count"
import { cn } from "@/lib/utils"
import { scrollFadeViewport } from "@/shared/fade"
import { api } from "../../../../convex/_generated/api"
import { DetailRow } from "../details"
import { type ExecutionItem } from "../types"
import { ActivityEmpty, ActivitySkeleton } from "./empty"
import { ActivityTimeline } from "./item"
import { type ActivityResult } from "./types"

export function RunActivity({
  now,
  runId,
  organizationId,
}: {
  now: number
  runId: ExecutionItem["id"]
  organizationId: string
}) {
  const activity = useQuery(api.runs.activity.index.list, {
    runId,
    organizationId,
  })

  return (
    <DetailRow icon={Logs} label="Activity">
      <ActivityContent activity={activity} now={now} />
    </DetailRow>
  )
}

function ActivityContent({
  activity,
  now,
}: {
  activity: ActivityResult | undefined
  now: number
}) {
  if (activity === undefined) {
    return <ActivitySkeleton />
  }

  if (activity.items.length === 0) {
    return <ActivityEmpty />
  }

  return (
    <div className="grid min-w-0 gap-2">
      <div className="text-muted-foreground text-xs">
        {countLabel(activity.items.length, "event")}
      </div>
      <ScrollArea className={cn(scrollFadeViewport, "max-h-[28rem]")}>
        <div className="pr-2">
          <ActivityTimeline items={activity.items} now={now} />
        </div>
      </ScrollArea>
    </div>
  )
}
