import { type Doc } from "../../_generated/dataModel"
import { agentTitle, approvalTitle, offerTitle, waiterReason } from "./format"
import {
  type ActivityData,
  type ActivityItem,
  type ActivityStatus,
} from "./types"

export function projectRelationActivity(data: ActivityData): ActivityItem[] {
  return [
    ...data.approvals.map(projectApproval),
    ...data.offers.map(projectOffer),
    ...data.assets.map(projectAsset),
    ...data.waiters.map(projectWaiter),
    ...data.agents.map(projectAgent),
  ]
}

function projectApproval(approval: Doc<"approvals">): ActivityItem {
  const endedAt = approvalEndedAt(approval)

  return {
    id: approval._id,
    kind: "approval",
    status: approval.status,
    title: approvalTitle(approval.status),
    description: approval.summary,
    details: [{ label: "Tool", value: approval.tool }],
    durationMs: endedAt - approval.createdAt,
    endedAt,
    startedAt: approval.createdAt,
  }
}

function projectOffer(offer: Doc<"integrationOffers">): ActivityItem {
  return {
    id: offer._id,
    kind: "offer",
    status: offer.status === "claimed" ? "pending" : offer.status,
    title: offerTitle(offer.status),
    description: offer.summary,
    details: [{ label: "Integration", value: offer.integration }],
    durationMs: offer.updatedAt - offer.createdAt,
    endedAt: offer.updatedAt,
    startedAt: offer.createdAt,
  }
}

function projectAsset(asset: Doc<"assets">): ActivityItem {
  return {
    id: asset._id,
    kind: "asset",
    status: "completed",
    title: "Asset saved",
    description: asset.name,
    details: [
      { label: "Type", value: asset.mimeType },
      { label: "Size", value: formatBytes(asset.size) },
    ],
    startedAt: asset.createdAt,
  }
}

function projectWaiter(waiter: Doc<"waiters">): ActivityItem {
  return {
    id: waiter._id,
    kind: "wait",
    status: waiterStatus(waiter.status),
    title: waiter.status === "waiting" ? "Waiting for input" : "Run resumed",
    description:
      waiter.reason === undefined ? undefined : waiterReason(waiter.reason),
    durationMs: waiter.updatedAt - waiter.createdAt,
    endedAt: waiter.status === "waiting" ? undefined : waiter.updatedAt,
    startedAt: waiter.createdAt,
  }
}

function projectAgent(run: Doc<"runs">): ActivityItem {
  return {
    id: run._id,
    kind: "agent",
    status: agentStatus(run.status),
    title: agentTitle(run.status),
    description: run.snapshot.title,
    durationMs:
      run.endedAt === undefined ? undefined : run.endedAt - run.createdAt,
    endedAt: run.endedAt,
    isLive: run.status === "running",
    startedAt: run.createdAt,
  }
}

function approvalEndedAt(approval: Doc<"approvals">) {
  return (
    approval.decidedAt ??
    approval.cancelledAt ??
    approval.deliveryFailure?.failedAt ??
    (approval.status === "expired" ? approval.expiresAt : approval.createdAt)
  )
}

function waiterStatus(status: Doc<"waiters">["status"]): ActivityStatus {
  if (status === "waiting") {
    return "waiting"
  }

  if (status === "expired") {
    return "expired"
  }

  return status === "cancelled" ? "cancelled" : "completed"
}

function agentStatus(status: Doc<"runs">["status"]): ActivityStatus {
  return status === "queued" ? "pending" : status
}

function formatBytes(value: number) {
  return new Intl.NumberFormat("en", {
    maximumFractionDigits: 1,
    notation: "compact",
  }).format(value)
}
