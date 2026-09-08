import { decodeJson, encodeToolResult } from "../../../contracts/json"
import {
  type ApprovalHandoff,
  type OfferHandoff,
  type RunHandoffs,
} from "../../../contracts/runtime/handoffs"
import { type TranscriptMessage } from "../../runs/execution/transcript/schema"
import { type AgentRuntime } from "../platform"
import { markVisibleCommunication } from "../tools/index"
import { materializeSandboxResult } from "../tools/results"
import { recordApprovalResolved, recordOfferResolved } from "../trace/activity"
import {
  isPendingApproval,
  isPendingOffer,
  type PendingHandoff,
} from "./pending"
import { appendSessionMessages } from "./transcript"

/**
 * Bring the run's approvals and integration offers up to date: execute what
 * was approved, note what was refused, and report what is still open. A
 * settled handoff is progress, so the run thinks again instead of waiting.
 */
export async function reconcileHandoffs(runtime: AgentRuntime) {
  const handoffs = await runtime.platform.loadRunHandoffs({
    runId: runtime.context.run.id,
  })
  const applied = await applyHandoffs(runtime, handoffs)
  const messageProgressed = await appendSessionMessages(runtime)

  return {
    pending: applied.pending,
    progressed: applied.progressed || messageProgressed,
  }
}

export async function applyHandoffs(
  runtime: AgentRuntime,
  handoffs: RunHandoffs
) {
  const notes: TranscriptMessage[] = []
  let progressed = false

  for (const approval of handoffs.approvals) {
    if (await reconcileApproval(runtime, notes, approval)) {
      progressed = true
    }
  }

  for (const offer of handoffs.offers) {
    if (await reconcileOffer(runtime, notes, offer)) {
      progressed = true
    }
  }

  if (notes.length > 0) {
    await runtime.platform.appendTranscript(notes)
  }

  return {
    pending: pendingHandoffs(handoffs),
    progressed,
  }
}

async function reconcileApproval(
  runtime: AgentRuntime,
  notes: TranscriptMessage[],
  approval: ApprovalHandoff
) {
  if (isPendingApproval(approval)) {
    return false
  }

  await recordApprovalResolved(runtime, approval)

  if (approval.status === "approved") {
    return await executeApprovedAction(runtime, approval)
  }

  await runtime.platform.markApprovalConsumed({ approvalId: approval.id })
  notes.push(userNote(approvalOutcomeNote(approval)))

  return true
}

async function executeApprovedAction(
  runtime: AgentRuntime,
  approval: ApprovalHandoff
) {
  const execution = await runtime.platform.executeApproval({
    approvalId: approval.id,
    runId: runtime.context.run.id,
  })

  if (execution.state === "executing") {
    approval.executionPendingUntil = execution.expiresAt

    return false
  }

  delete approval.executionPendingUntil

  const result = await materializeSandboxResult(
    runtime,
    decodeJson(execution.result)
  )

  markVisibleCommunication(runtime, approval.tool, result)

  await runtime.platform.markApprovalConsumed({
    approvalId: approval.id,
    message: userNote(
      `Approved action \`${approval.tool}\` (${approval.code}) returned: ${encodeToolResult(result)}. Treat an error as a failure, not evidence that the action succeeded.`
    ),
  })

  return true
}

async function reconcileOffer(
  runtime: AgentRuntime,
  notes: TranscriptMessage[],
  offer: OfferHandoff
) {
  if (isPendingOffer(offer)) {
    return false
  }

  await recordOfferResolved(runtime, offer)
  await runtime.platform.markOfferConsumed({ integrationOfferId: offer.id })

  // The next model step rebuilds the prompt and the tool list from the
  // database, so a newly connected integration needs no refresh here.
  notes.push(
    userNote(
      offer.status === "connected"
        ? `${offer.integration} is now connected and its tools are available. Continue with the request.`
        : offerOutcomeNote(offer)
    )
  )

  return true
}

function pendingHandoffs(handoffs: RunHandoffs): PendingHandoff[] {
  const approvals = handoffs.approvals
    .filter(
      (approval) =>
        isPendingApproval(approval) ||
        approval.executionPendingUntil !== undefined
    )
    .map((approval) => ({
      expiresAt: approval.executionPendingUntil ?? approval.expiresAt,
      subject: { id: approval.id, kind: "approval" as const },
    }))
  const offers = handoffs.offers.filter(isPendingOffer).map((offer) => ({
    expiresAt: offer.expiresAt,
    subject: { id: offer.id, kind: "offer" as const },
  }))

  return [...approvals, ...offers]
}

function userNote(content: string): TranscriptMessage {
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
