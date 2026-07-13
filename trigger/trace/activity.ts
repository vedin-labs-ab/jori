import { isRecord } from "../../contracts/json"
import { type RuntimePlatform } from "../platform"
import {
  type ApprovalHandoff,
  type ConvexId,
  type OfferHandoff,
  type RuntimeContext,
  type RuntimeEventTraceData,
} from "../types"
import { recordRuntimeEvent } from "./runtime"

export async function recordToolResultActivity(args: {
  convex: RuntimePlatform
  context: RuntimeContext
  result: unknown
  sequence: number
  toolName: string
}) {
  const event = toolResultEvent(args.toolName, args.result)

  if (event === undefined) {
    return
  }

  await recordRuntimeEvent(args.convex, args.context, {
    data: event.data,
    keyId: event.keyId,
    sequence: args.sequence,
    type: event.type,
  })
}

export async function recordApprovalResolved(
  runtime: ActivityRuntime,
  approval: ApprovalHandoff
) {
  await recordRuntimeEvent(runtime.convex, runtime.context, {
    data: { approval: approval.id },
    keyId: approval.id,
    sequence: 800_000,
    type: "approval.resolved",
  })
}

export async function recordOfferResolved(
  runtime: ActivityRuntime,
  offer: OfferHandoff
) {
  await recordRuntimeEvent(runtime.convex, runtime.context, {
    data: { offer: offer.id },
    keyId: offer.id,
    sequence: 810_000,
    type: "offer.resolved",
  })
}

type ToolResultEvent = {
  data: RuntimeEventTraceData
  keyId: string
  type:
    | "agent.started"
    | "approval.requested"
    | "asset.saved"
    | "offer.requested"
}

type ActivityRuntime = {
  convex: RuntimePlatform
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
    data: { approval: approvalId as ConvexId<"approvals"> },
    keyId: approvalId,
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

  return {
    data: { offer: offerId as ConvexId<"integrationOffers"> },
    keyId: offerId,
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
    data: { child: runId as ConvexId<"runs"> },
    keyId: runId,
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
    data: { asset: assetId as ConvexId<"assets"> },
    keyId: assetId,
    type: "asset.saved",
  }
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : undefined
}
