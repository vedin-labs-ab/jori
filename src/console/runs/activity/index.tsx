import { useQuery } from "convex/react"
import { type FunctionArgs } from "convex/server"
import { ListChecks } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { api } from "../../../../convex/_generated/api"
import { DetailFrame, DetailRow } from "../../shared/details"
import { ActivityEmpty, ActivitySkeleton } from "./empty"
import { ActivityItem } from "./item"

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
      icon={ListChecks}
      iconClassName="text-muted-foreground"
      label="Activity"
    >
      <DetailFrame
        className="h-auto min-h-48"
        header={activityCaption(activity?.items.length)}
      >
        {activity === undefined ? (
          <ActivitySkeleton />
        ) : activity.items.length === 0 ? (
          <ActivityEmpty />
        ) : (
          <ScrollArea className="max-h-[28rem]">
            <div className="grid gap-2 p-2">
              {activity.items.map((item) => (
                <ActivityItem item={item} key={item.id} now={now} />
              ))}
            </div>
          </ScrollArea>
        )}
      </DetailFrame>
    </DetailRow>
  )
}

function activityCaption(count: number | undefined) {
  if (count === undefined) {
    return "Loading"
  }

  return count === 1 ? "1 event" : `${count} events`
}
