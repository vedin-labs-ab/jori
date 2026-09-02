import {
  type ActivityItem,
  type ActivityResult,
} from "@/shared/console/runs/activity/types"
import { type ExecutionItem } from "@/shared/console/runs/types"
import { type DemoAction, type DemoState } from "./types"

export function reduceRuns(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case "stopRun":
      return {
        ...state,
        runs: patchRun(state.runs, action.runId, (run) =>
          stopped(run, action.actor, action.at)
        ),
        activity: patchLog(state.activity, action.runId, (items) => [
          ...items.map((item) => settled(item, action.at)),
          {
            id: `${action.runId}:stopped`,
            kind: "run",
            status: "stopped",
            title: "Run stopped",
            description: `Stopped by ${action.actor}`,
            startedAt: action.at,
          },
        ]),
      }
    case "decideApproval":
      return {
        ...state,
        runs: patchRun(state.runs, action.runId, (run) =>
          decided(run, action.approvalId, action.decision, action.at)
        ),
        activity: patchLog(state.activity, action.runId, (items) => [
          ...items.map((item) =>
            item.kind === "approval" && item.status === "pending"
              ? {
                  ...ended(item, action.at),
                  status: action.decision,
                  title:
                    action.decision === "approved"
                      ? "Action approved"
                      : "Approval denied",
                }
              : item
          ),
          thinking(action.runId, action.at),
        ]),
      }
    case "settleOffer":
      return {
        ...state,
        runs: patchRun(state.runs, action.runId, (run) => ({
          ...run,
          offers: run.offers.map((offer) =>
            offer.id === action.offerId
              ? { ...offer, state: action.state, updatedAt: action.at }
              : offer
          ),
        })),
      }
    default:
      return state
  }
}

function patchRun(
  runs: ExecutionItem[],
  runId: string,
  patch: (run: ExecutionItem) => ExecutionItem
) {
  return runs.map((run) => (run.id === runId ? patch(run) : run))
}

function patchLog(
  activity: Record<string, ActivityResult>,
  runId: string,
  patch: (items: ActivityItem[]) => ActivityItem[]
) {
  const log = activity[runId]

  if (log === undefined) {
    return activity
  }

  const patched: ActivityResult = { items: patch(log.items), status: "loaded" }

  return { ...activity, [runId]: patched }
}

/** A stopped run ends now, says who stopped it, and lets any approval it
 *  was waiting on go. */
function stopped(run: ExecutionItem, actor: string, at: number): ExecutionItem {
  const approvals = run.approvals.map((approval) =>
    approval.state === "pending"
      ? { ...approval, state: "cancelled" as const }
      : approval
  )

  return {
    ...run,
    status: "stopped",
    endedAt: at,
    durationMs: Math.max(0, at - run.createdAt),
    source: { ...run.source, stop: { actor: { type: "user", label: actor } } },
    details: [{ type: "stopped", label: actor, timestamp: at }, ...run.details],
    approval: approvals[0] ?? null,
    approvals,
  }
}

function decided(
  run: ExecutionItem,
  approvalId: string,
  decision: "approved" | "denied",
  at: number
): ExecutionItem {
  const approvals = run.approvals.map((approval) =>
    approval.id === approvalId
      ? { ...approval, state: decision, decidedAt: at }
      : approval
  )

  return { ...run, approval: approvals[0] ?? null, approvals }
}

/** A live item at the moment its run stops: a model step ends stopped, an
 *  approval is let go, and nothing keeps counting. */
function settled(item: ActivityItem, at: number): ActivityItem {
  if (item.isLive !== true) {
    return item
  }

  if (item.kind === "model") {
    return { ...ended(item, at), status: "stopped" }
  }

  if (item.kind === "approval") {
    return {
      ...ended(item, at),
      status: "cancelled",
      title: "Approval cancelled",
    }
  }

  return { ...item, isLive: false }
}

function ended(item: ActivityItem, at: number): ActivityItem {
  return {
    ...item,
    isLive: false,
    endedAt: at,
    durationMs: Math.max(0, at - item.startedAt),
  }
}

function thinking(runId: string, at: number): ActivityItem {
  return {
    id: `${runId}:resumed:${at}`,
    kind: "model",
    status: "running",
    title: "Thinking",
    isLive: true,
    startedAt: at,
  }
}
