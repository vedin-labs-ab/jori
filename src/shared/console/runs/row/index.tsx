import { Timer } from "lucide-react"
import { memo, type ReactNode, Suspense, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { formatDuration, relativeTime } from "../../time"
import { RelativeTime } from "../details"
import { ExpiringStatusMeta } from "../request/status"
import { type ExecutionItem } from "../types"
import {
  RunRowBody,
  RunRowContent,
  RunRowControl,
  RunRowFrame,
  RunRowHeader,
  RunRowMeta,
} from "./layout"
import { SourceLine } from "./source"
import { MetaPill, StatusIcon } from "./status"

/** What the list hands every row: the run's detail once the row opens,
 *  and the control that stops it while it is still going. Both are
 *  functions of the run rather than elements, so a memoized row sees the
 *  same props from one tick of the clock to the next. */
export type RunRowSlots = {
  /** The run's detail, mounted once the row is opened. */
  expanded: (execution: ExecutionItem, now: number) => ReactNode
  /** Raised as the row is hovered, focused, or clicked, ahead of the
   *  detail mounting, so a lazily loaded detail can fetch in time. */
  onPreload?: () => void
  /** The control that stops the run, shown while it is queued or running. */
  stop?: (execution: ExecutionItem) => ReactNode
}

export const ExecutionRow = memo(function ExecutionRow({
  defaultOpen = false,
  execution,
  expanded,
  now,
  onPreload,
  open = false,
  showAudience,
  stop,
}: RunRowSlots & {
  /** Whether the row opens on mount; the list decides which row does. */
  defaultOpen?: boolean
  execution: ExecutionItem
  now: number
  /** Set, the row stands open with no control to close it: one run shown
   *  on its own, as the chat's pane shows it. */
  open?: boolean
  showAudience: boolean
}) {
  const [isToggledOpen, setIsToggledOpen] = useState(defaultOpen)
  const isOpen = open || isToggledOpen
  const durationMs = durationFor(execution, now)
  const isOngoing =
    execution.status === "queued" || execution.status === "running"
  const approvalIndicator = actionApprovalIndicator(execution, now)
  const offerIndicator = actionOfferIndicator(execution, now)

  return (
    <RunRowFrame id={execution.id}>
      <RunRowHeader action={isOngoing ? stop?.(execution) : undefined}>
        <RunRowControl
          expanded={isOpen}
          onClick={
            open
              ? undefined
              : () => {
                  onPreload?.()
                  setIsToggledOpen((current) => !current)
                }
          }
          onFocus={onPreload}
          onPointerEnter={onPreload}
        >
          <StatusIcon
            approval={approvalIndicator}
            now={now}
            offer={offerIndicator}
            status={execution.status}
            waiter={execution.waiter ?? null}
          />
          <ExecutionTitle execution={execution} showAudience={showAudience} />
          <ExecutionMeta
            durationMs={durationMs}
            execution={execution}
            isOpen={isOpen}
            now={now}
          />
        </RunRowControl>
      </RunRowHeader>
      {isOpen ? (
        <Suspense fallback={<ExpandedExecutionFallback />}>
          {expanded(execution, now)}
        </Suspense>
      ) : null}
    </RunRowFrame>
  )
})

function ExecutionTitle({
  execution,
  showAudience,
}: {
  execution: ExecutionItem
  showAudience: boolean
}) {
  return (
    <RunRowContent title={execution.title}>
      <SourceLine
        details={execution.details}
        audience={showAudience ? execution.audience : undefined}
        source={execution.source}
      />
    </RunRowContent>
  )
}

function ExecutionMeta({
  durationMs,
  execution,
  isOpen,
  now,
}: {
  durationMs: number | undefined
  execution: ExecutionItem
  isOpen: boolean
  now: number
}) {
  const liveApproval = livePendingApproval(execution.approvals, now)
  const liveOffer = livePendingOffer(execution.offers, now)

  return (
    <RunRowMeta>
      {liveApproval !== null ? (
        <ExpiringStatusMeta
          expiresAt={liveApproval.expiresAt}
          isVisible={!isOpen}
          label="Needs approval"
          now={now}
        />
      ) : null}
      {liveApproval === null && liveOffer !== null ? (
        <ExpiringStatusMeta
          expiresAt={liveOffer.expiresAt}
          isVisible={!isOpen}
          label="Needs action"
          now={now}
        />
      ) : null}
      {durationMs !== undefined ? (
        <MetaPill icon={Timer} label={formatDuration(durationMs)} />
      ) : null}
      <RelativeTime
        absolute={execution.createdAt}
        value={relativeTime(execution.createdAt, now)}
      />
    </RunRowMeta>
  )
}

function ExpandedExecutionFallback() {
  return (
    <RunRowBody>
      <div
        aria-label="Loading run details"
        className="grid gap-3 px-3 py-3 text-xs sm:grid-cols-[10rem_1fr]"
        role="status"
      >
        <div className="flex items-center gap-2">
          <Skeleton className="size-3.5" />
          <Skeleton className="h-3 w-14" />
        </div>
        <div className="grid min-w-0 gap-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
    </RunRowBody>
  )
}

function durationFor(execution: ExecutionItem, now: number) {
  if (execution.endedAt === undefined) {
    return Math.max(0, now - execution.createdAt)
  }

  return execution.durationMs
}

function actionApprovalIndicator(execution: ExecutionItem, now: number) {
  return livePendingApproval(execution.approvals, now) ?? execution.approval
}

function actionOfferIndicator(execution: ExecutionItem, now: number) {
  return livePendingOffer(execution.offers, now) ?? execution.offer
}

function livePendingApproval(
  approvals: ExecutionItem["approvals"],
  now: number
) {
  return (
    approvals.find(
      (approval) => approval.state === "pending" && approval.expiresAt > now
    ) ?? null
  )
}

function livePendingOffer(offers: ExecutionItem["offers"], now: number) {
  return (
    offers.find(
      (offer) =>
        (offer.state === "pending" || offer.state === "claimed") &&
        offer.expiresAt > now
    ) ?? null
  )
}
