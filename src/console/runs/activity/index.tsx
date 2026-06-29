import { useQuery } from "convex/react"
import { type FunctionArgs } from "convex/server"
import { Logs } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { api } from "../../../../convex/_generated/api"
import { DetailRow } from "../../shared/details"
import { ActivityEmpty, ActivitySkeleton } from "./empty"
import { ActivityTimeline } from "./item"
import { type ActivityResult } from "./types"

type RunId = FunctionArgs<typeof api.runs.activity.index.list>["runId"]

export function RunActivity({
  now,
  runId,
  tenantId,
}: {
  now: number
  runId: string
  tenantId: string
}) {
  const activity = useQuery(api.runs.activity.index.list, {
    runId: runId as RunId,
    tenantId,
  })

  return (
    <DetailRow
      icon={Logs}
      iconClassName="text-muted-foreground"
      label="Activity"
    >
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
        {activityCaption(activity.items.length)}
      </div>
      <ScrollArea className="max-h-[28rem]">
        <div className="pr-2">
          <ActivityTimeline items={activity.items} now={now} />
        </div>
      </ScrollArea>
    </div>
  )
}

function activityCaption(count: number | undefined) {
  if (count === undefined) {
    return "Loading"
  }

  return count === 1 ? "1 event" : `${count} events`
}
