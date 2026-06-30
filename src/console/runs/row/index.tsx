import { Timer } from "lucide-react"
import { lazy, memo, Suspense, useCallback, useState } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { RelativeTime } from "../../shared/details"
import { formatDuration, relativeTime } from "../../shared/time"
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
import {
  ApprovalStatusMeta,
  MetaPill,
  OfferStatusMeta,
  StatusIcon,
} from "./status"
import { StopExecution } from "./stop"

let expandedExecutionModule: Promise<typeof import("./expanded")> | undefined

function loadExpandedExecution() {
  expandedExecutionModule ??= import("./expanded")
  return expandedExecutionModule
}

const ExpandedExecution = lazy(async () => ({
  default: (await loadExpandedExecution()).ExpandedExecution,
}))

export const ExecutionRow = memo(function ExecutionRow({
  execution,
  now,
  tenantId,
}: {
  execution: ExecutionItem
  now: number
  tenantId: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const preloadExpandedExecution = useCallback(() => {
    void loadExpandedExecution()
  }, [])
  const durationMs = durationFor(execution, now)
  const isOngoing =
    execution.status === "queued" || execution.status === "running"
  const approvalIndicator = actionApprovalIndicator(execution, now)
  const offerIndicator = actionOfferIndicator(execution, now)

  return (
    <RunRowFrame>
      <RunRowHeader
        action={
          isOngoing ? (
            <StopExecution
              className="mr-3 shrink-0"
              runId={execution.id}
              tenantId={tenantId}
            />
          ) : undefined
        }
      >
        <RunRowControl
          onClick={() => {
            preloadExpandedExecution()
            setIsOpen((current) => !current)
          }}
          onFocus={preloadExpandedExecution}
          onPointerEnter={preloadExpandedExecution}
        >
          <StatusIcon
            approval={approvalIndicator}
            now={now}
            offer={offerIndicator}
            status={execution.status}
            waiter={execution.waiter ?? null}
          />
          <ExecutionTitle execution={execution} />
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
          <ExpandedExecution
            execution={execution}
            now={now}
            tenantId={tenantId}
          />
        </Suspense>
      ) : null}
    </RunRowFrame>
  )
})

function ExecutionTitle({ execution }: { execution: ExecutionItem }) {
  return (
    <RunRowContent title={execution.title}>
      <SourceLine details={execution.details} source={execution.source} />
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
        <ApprovalStatusMeta
          expiresAt={liveApproval.expiresAt}
          isVisible={!isOpen}
          now={now}
        />
      ) : null}
      {liveApproval === null && liveOffer !== null ? (
        <OfferStatusMeta
          expiresAt={liveOffer.expiresAt}
          isVisible={!isOpen}
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
