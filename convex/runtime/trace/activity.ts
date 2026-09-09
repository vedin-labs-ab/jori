import { isRecord } from "../../../contracts/json"
import { type RuntimeContext } from "../../../contracts/runtime/context"
import { type RuntimeEventTraceData } from "../../../contracts/runtime/events"
import {
  type ApprovalHandoff,
  type OfferHandoff,
} from "../../../contracts/runtime/handoffs"
import { type RuntimeId } from "../../../contracts/runtime/ids"
import { optionalString } from "../../shared/input"
import { type RuntimePlatform, type TraceRuntime } from "../platform"
import { recordRuntimeEvent } from "./record"

export async function recordToolResultActivity(args: {
  platform: RuntimePlatform
  context: RuntimeContext
  result: unknown
  sequence: number
  toolName: string
}) {
  const event = toolResultEvent(args.toolName, args.result)

  if (event === undefined) {
    return
  }

  await recordRuntimeEvent(args.platform, args.context, {
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
  await recordRuntimeEvent(runtime.platform, runtime.context, {
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
  await recordRuntimeEvent(runtime.platform, runtime.context, {
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
    data: { approval: approvalId as RuntimeId<"approvals"> },
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
    data: { offer: offerId as RuntimeId<"integrationOffers"> },
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
    data: { child: runId as RuntimeId<"runs"> },
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
    data: { file: fileId as RuntimeId<"files"> },
    keyId: fileId,
    type: "file.saved",
  }
}
