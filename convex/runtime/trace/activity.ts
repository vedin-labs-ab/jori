import { isRecord } from "../../../contracts/json"
import { type Id } from "../../_generated/dataModel"
import { type TraceData } from "../../runs/execution/traces/schema"
import {
  type ApprovalHandoff,
  type OfferHandoff,
} from "../../runs/execution/waiters/handoffs"
import { optionalString } from "../../shared/input"
import { type TraceRuntime } from "../platform/types"
import { recordRuntimeEvent } from "./record"

export async function recordToolResultActivity(args: {
  runtime: TraceRuntime
  result: unknown
  sequence: number
  toolName: string
}) {
  const event = toolResultEvent(args.toolName, args.result)

  if (event === undefined) {
    return
  }

  await recordRuntimeEvent(args.runtime, {
    data: event.data,
    keyId: event.keyId,
    sequence: args.sequence,
    type: event.type,
  })
}

export async function recordApprovalResolved(
  runtime: TraceRuntime,
  approval: ApprovalHandoff
) {
  await recordRuntimeEvent(runtime, {
    data: { approval: approval.id },
    keyId: approval.id,
    sequence: 800_000,
    type: "approval.resolved",
  })
}

export async function recordOfferResolved(
  runtime: TraceRuntime,
  offer: OfferHandoff
) {
  await recordRuntimeEvent(runtime, {
    data: { offer: offer.id },
    keyId: offer.id,
    sequence: 810_000,
    type: "offer.resolved",
  })
}

type ToolResultEvent = {
  data: TraceData
  keyId: string
  type:
    | "agent.started"
    | "approval.requested"
    | "file.saved"
    | "offer.requested"
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
    fileEvent(result)
  )
}

function approvalEvent(
  result: Record<string, unknown>
): ToolResultEvent | undefined {
  const approvalId = optionalString(result.approvalId)

  if (result.status !== "approval_requested" || approvalId === undefined) {
    return undefined
  }

  return {
    data: { approval: approvalId as Id<"approvals"> },
    keyId: approvalId,
    type: "approval.requested",
  }
}

function offerEvent(
  result: Record<string, unknown>
): ToolResultEvent | undefined {
  const offerId = optionalString(result.integrationOfferId)

  if (offerId === undefined) {
    return undefined
  }

  return {
    data: { offer: offerId as Id<"integrationOffers"> },
    keyId: offerId,
    type: "offer.requested",
  }
}

function agentEvent(
  toolName: string,
  result: Record<string, unknown>
): ToolResultEvent | undefined {
  const runId = optionalString(result.runId)

  if (toolName !== "start_agent" || runId === undefined) {
    return undefined
  }

  return {
    data: { child: runId as Id<"runs"> },
    keyId: runId,
    type: "agent.started",
  }
}

function fileEvent(
  result: Record<string, unknown>
): ToolResultEvent | undefined {
  const fileId = optionalString(result.fileId)

  if (fileId === undefined) {
    return undefined
  }

  return {
    data: { file: fileId as Id<"files"> },
    keyId: fileId,
    type: "file.saved",
  }
}
