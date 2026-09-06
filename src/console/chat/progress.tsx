import { useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { type ChatRun } from "@/shared/console/chat/types"
import { ChatWorking } from "@/shared/console/chat/working"
import {
  ActivityEmpty,
  ActivitySkeleton,
} from "@/shared/console/runs/activity/empty"
import { ActivityTimeline } from "@/shared/console/runs/activity/item"
import { type ActivityResult } from "@/shared/console/runs/activity/types"
import { api } from "../../../convex/_generated/api"
import { RunApprovals } from "../runs/request/approval"
import { RunOffers } from "../runs/request/offer"

const calloutClassName = "overflow-hidden rounded-lg border bg-background"

/** What the live run is doing, bound to Convex: the working line with the
 *  run's log folded under it, and the approvals and connections it is
 *  waiting on as callouts under that, each talking to the same functions
 *  the Activity page's rows use. Mounted only while the run is live, so
 *  the subscriptions end with it. */
export function ChatProgress({
  now,
  onStop,
  organizationId,
  run,
}: {
  now: number
  onStop: () => void
  organizationId: string
  run: ChatRun
}) {
  const runId = run.id as GenericId<"runs">
  const summary = useQuery(api.runs.console.live.get, { organizationId, runId })
  const activity = useQuery(api.runs.activity.index.list, {
    organizationId,
    runId,
  })

  return (
    <>
      <ChatWorking
        onStop={onStop}
        progress={<Log activity={activity} now={now} />}
      />
      {summary === null || summary === undefined ? null : (
        <>
          {summary.approvals.length === 0 ? null : (
            <div className={calloutClassName}>
              <RunApprovals
                approvals={summary.approvals}
                now={now}
                organizationId={organizationId}
              />
            </div>
          )}
          {summary.offers.length === 0 ? null : (
            <div className={calloutClassName}>
              <RunOffers
                now={now}
                offers={summary.offers}
                organizationId={organizationId}
                runId={summary.id}
              />
            </div>
          )}
        </>
      )}
    </>
  )
}

function Log({
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

  return <ActivityTimeline items={activity.items} now={now} />
}
