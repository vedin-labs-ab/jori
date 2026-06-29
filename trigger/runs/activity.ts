import { type MiloConvexClient } from "../convex"
import {
  type ApprovalHandoff,
  type ConvexId,
  type OfferHandoff,
  type RuntimeContext,
  type RuntimeEventTraceData,
  type RuntimeEventType,
} from "../types"
import { recordActivityEvent } from "./events"

export async function recordToolResultActivity(args: {
  attempt: number
  callId: string
  convex: MiloConvexClient
  context: RuntimeContext
  result: unknown
  sequence: number
  toolName: string
}) {
  const event = toolResultEvent(args.toolName, args.result)

  if (event === undefined) {
    return
  }

  await recordActivityEvent(args.convex, args.context, {
    attempt: args.attempt,
    callId: `${args.callId}:${event.callId}`,
    data: event.data,
    sequence: args.sequence,
    source: event.source,
    type: event.type,
  })
}

export async function recordApprovalResolved(
  runtime: ActivityRuntime,
  approval: ApprovalHandoff
) {
  await recordActivityEvent(runtime.convex, runtime.context, {
    callId: approval.id,
    data: {
      status: approval.status,
      subject: { kind: "approval", id: approval.id },
      summary: approval.summary,
      title: approvalStatusTitle(approval.status),
    },
    sequence: 800_000,
    source: "trigger.approval",
    type: "approval.resolved",
  })
}

export async function recordOfferResolved(
  runtime: ActivityRuntime,
  offer: OfferHandoff
) {
  await recordActivityEvent(runtime.convex, runtime.context, {
    callId: offer.id,
    data: {
      status: offerTraceStatus(offer.status),
      subject: { kind: "offer", id: offer.id },
      summary: offer.summary ?? undefined,
      title: offerStatusTitle(offer.status),
    },
    sequence: 810_000,
    source: "trigger.run",
    type: "offer.resolved",
  })
}

type ToolResultEvent = {
  callId: string
  data: RuntimeEventTraceData
  source: "trigger.approval" | "trigger.run"
  type: RuntimeEventType
}

type ActivityRuntime = {
  convex: MiloConvexClient
  context: RuntimeContext
}

function toolResultEvent(
  toolName: string,
  result: unknown
): ToolResultEvent | undefined {
  if (!isRecord(result)) {
    return undefined
  }

  return (
    approvalEvent(result) ??
    offerEvent(result) ??
    agentEvent(toolName, result) ??
    assetEvent(result)
  )
}

function approvalEvent(
  result: Record<string, unknown>
): ToolResultEvent | undefined {
  const approvalId = readString(result.approvalId)

  if (result.status !== "approval_requested" || approvalId === undefined) {
    return undefined
  }

  return {
    callId: approvalId,
    data: {
      status: "requested",
      subject: { kind: "approval", id: approvalId as ConvexId<"approvals"> },
      title: "Approval requested",
    },
    source: "trigger.approval",
    type: "approval.requested",
  }
}

function offerEvent(
  result: Record<string, unknown>
): ToolResultEvent | undefined {
  const offerId = readString(result.integrationOfferId)

  if (offerId === undefined) {
    return undefined
  }

  const integration = readString(result.integration)

  return {
    callId: offerId,
    data: {
      status: "requested",
      subject: { kind: "offer", id: offerId as ConvexId<"integrationOffers"> },
      summary:
        integration === undefined ? undefined : `${integration} requested`,
      title: "Integration offered",
    },
    source: "trigger.run",
    type: "offer.requested",
  }
}

function agentEvent(
  toolName: string,
  result: Record<string, unknown>
): ToolResultEvent | undefined {
  const runId = readString(result.runId)

  if (toolName !== "start_agent" || runId === undefined) {
    return undefined
  }

  return {
    callId: runId,
    data: {
      status: "running",
      subject: { kind: "agent", id: runId as ConvexId<"runs"> },
      title: "Agent started",
    },
    source: "trigger.run",
    type: "agent.started",
  }
}

function assetEvent(
  result: Record<string, unknown>
): ToolResultEvent | undefined {
  const assetId = readString(result.assetId)

  if (assetId === undefined) {
    return undefined
  }

  return {
    callId: assetId,
    data: {
      status: "completed",
      subject: { kind: "asset", id: assetId as ConvexId<"assets"> },
      summary: readString(result.name),
      title: "Asset saved",
    },
    source: "trigger.run",
    type: "asset.saved",
  }
}

function approvalStatusTitle(status: ApprovalHandoff["status"]) {
  switch (status) {
    case "approved":
      return "Approval approved"
    case "cancelled":
      return "Approval cancelled"
    case "denied":
      return "Approval denied"
    case "expired":
      return "Approval expired"
    case "failed":
      return "Approval failed"
    case "pending":
      return "Approval pending"
  }
}

function offerStatusTitle(status: OfferHandoff["status"]) {
  switch (status) {
    case "cancelled":
      return "Integration offer cancelled"
    case "claimed":
      return "Integration offer claimed"
    case "connected":
      return "Integration connected"
    case "expired":
      return "Integration offer expired"
    case "failed":
      return "Integration offer failed"
    case "pending":
      return "Integration offer pending"
  }
}

function offerTraceStatus(status: OfferHandoff["status"]) {
  return status === "claimed" ? "pending" : status
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
