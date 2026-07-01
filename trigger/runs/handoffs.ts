import { decodeToolResult, encodeToolResult } from "../../contracts/transport"
import { materializeSandboxResult } from "../assets"
import { type ModelMessage } from "../model/types"
import { markVisibleCommunication, type ToolRuntime } from "../tool"
import {
  type ApprovalHandoff,
  type OfferHandoff,
  type RunHandoffs,
} from "../types"
import { recordApprovalResolved, recordOfferResolved } from "./activity"
import { appendSessionMessages } from "./messages"

export type HandoffKind = "approval" | "offer"
export type HandoffDeadline = { expiresAt: number; kind: HandoffKind }

export type ReconcileResult = {
  handoffProgressed: boolean
  messageProgressed: boolean
  progressed: boolean
  pending: HandoffDeadline[]
}

export async function reconcileHandoffs(
  runtime: ToolRuntime,
  messages: ModelMessage[]
): Promise<ReconcileResult> {
  const handoffs = await runtime.convex.loadRunHandoffs({
    runId: runtime.context.run.id,
  })
  let handoffProgressed = false

  for (const approval of handoffs.approvals) {
    if (await reconcileApproval(runtime, messages, approval)) {
      handoffProgressed = true
    }
  }

  for (const offer of handoffs.offers) {
    if (await reconcileOffer(runtime, messages, offer)) {
      handoffProgressed = true
    }
  }

  const messageProgressed = await appendSessionMessages(runtime, messages)
  const progressed = handoffProgressed || messageProgressed

  return {
    handoffProgressed,
    messageProgressed,
    progressed,
    pending: pendingDeadlines(handoffs),
  }
}

export function hasResolvedHandoffs(handoffs: RunHandoffs) {
  return (
    handoffs.approvals.some((approval) => approval.status !== "pending") ||
    handoffs.offers.some(
      (offer) => offer.status !== "pending" && offer.status !== "claimed"
    )
  )
}

async function reconcileApproval(
  runtime: ToolRuntime,
  messages: ModelMessage[],
  approval: ApprovalHandoff
) {
  if (approval.status === "pending") {
    return false
  }

  await recordApprovalResolved(runtime, approval)

  if (approval.status === "approved") {
    await executeApprovedAction(runtime, messages, approval)
    return true
  }

  await runtime.convex.markApprovalConsumed({ approvalId: approval.id })
  messages.push(userNote(approvalOutcomeNote(approval)))

  return true
}

async function executeApprovedAction(
  runtime: ToolRuntime,
  messages: ModelMessage[],
  approval: ApprovalHandoff
) {
  const encoded = await runtime.convex.executeApproval({
    approvalId: approval.id,
    runId: runtime.context.run.id,
  })
  const result = await materializeSandboxResult(
    runtime,
    decodeToolResult(encoded)
  )

  markVisibleCommunication(runtime, approval.tool, result)
  messages.push(
    userNote(
      `Approved action \`${approval.tool}\` (${approval.code}) ran. Result: ${encodeToolResult(result)}`
    )
  )
}

async function reconcileOffer(
  runtime: ToolRuntime,
  messages: ModelMessage[],
  offer: OfferHandoff
) {
  if (offer.status === "pending" || offer.status === "claimed") {
    return false
  }

  await recordOfferResolved(runtime, offer)
  await runtime.convex.markOfferConsumed({ integrationOfferId: offer.id })

  if (offer.status === "connected") {
    await refreshRuntimeContext(runtime, messages)
    messages.push(
      userNote(
        `${offer.integration} is now connected and its tools are available. Continue with the request.`
      )
    )
    return true
  }

  messages.push(userNote(offerOutcomeNote(offer)))

  return true
}

async function refreshRuntimeContext(
  runtime: ToolRuntime,
  messages: ModelMessage[]
) {
  const reloaded = await runtime.convex.reloadContext({
    runId: runtime.context.run.id,
  })

  runtime.context.tools = reloaded.tools
  runtime.context.activeSurface = reloaded.activeSurface

  if (messages.length > 0 && messages[0].role === "system") {
    messages[0] = { content: reloaded.prompt, role: "system" }
  }
}

function pendingDeadlines(handoffs: RunHandoffs): HandoffDeadline[] {
  const approvals = handoffs.approvals
    .filter((approval) => approval.status === "pending")
    .map((approval) => ({
      expiresAt: approval.expiresAt,
      kind: "approval" as const,
    }))
  const offers = handoffs.offers
    .filter((offer) => offer.status === "pending" || offer.status === "claimed")
    .map((offer) => ({ expiresAt: offer.expiresAt, kind: "offer" as const }))

  return [...approvals, ...offers]
}

function userNote(content: string): ModelMessage {
  return { content, role: "user" }
}

function approvalOutcomeNote(approval: ApprovalHandoff) {
  if (approval.status === "denied") {
    return `Approval ${approval.code} for \`${approval.tool}\` was denied. Do not retry; continue on a safe path or report what is blocked.`
  }

  if (approval.status === "expired") {
    return `Approval ${approval.code} for \`${approval.tool}\` expired before a decision. Do not retry; continue on a safe path or report what is blocked.`
  }

  if (approval.status === "failed") {
    return `Approval ${approval.code} for \`${approval.tool}\` failed before it could be delivered. Do not retry; report what is blocked.`
  }

  return `Approval ${approval.code} for \`${approval.tool}\` was cancelled. Do not retry it.`
}

function offerOutcomeNote(offer: OfferHandoff) {
  if (offer.status === "failed") {
    return `The ${offer.integration} integration failed. Continue without it or report what is blocked.`
  }

  if (offer.status === "expired") {
    return `The ${offer.integration} integration offer expired. Continue without it or report what is blocked.`
  }

  return `The ${offer.integration} integration offer was cancelled. Continue without it.`
}
