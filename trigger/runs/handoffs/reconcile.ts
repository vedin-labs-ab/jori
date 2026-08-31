import { decodeJson } from "../../../contracts/json"
import { encodeToolResult } from "../../../contracts/json/transport"
import {
  type ApprovalHandoff,
  type HandoffSubject,
  type OfferHandoff,
  type RunHandoffs,
} from "../../../contracts/runtime/worker"
import { type ModelMessage } from "../../model/types"
import { type AgentRuntime } from "../../runtime"
import { markVisibleCommunication } from "../../tool"
import { materializeSandboxResult } from "../../tool/results"
import {
  recordApprovalResolved,
  recordOfferResolved,
} from "../../trace/activity"
import { appendSessionMessages, replacePromptMessages } from "../messages"
import {
  isPendingApproval,
  isPendingOffer,
  type PendingHandoff,
} from "./pending"

export async function reconcileHandoffs(
  runtime: AgentRuntime,
  messages: ModelMessage[],
  subjects: HandoffSubject[] = []
) {
  const [subjectHandoffs, runHandoffs] = await Promise.all([
    loadSubjectHandoffs(runtime, subjects),
    runtime.platform.loadRunHandoffs({ runId: runtime.context.run.id }),
  ])
  const applied = await applyHandoffs(
    runtime,
    messages,
    mergeHandoffs(subjectHandoffs, runHandoffs)
  )
  const messageProgressed = await appendSessionMessages(runtime, messages)

  return {
    pending: applied.pending,
    progressed: applied.progressed || messageProgressed,
  }
}

// Applies already-loaded handoffs without fetching or draining; run entry
// uses this with the handoffs bundled into the runtime context load.
export async function applyHandoffs(
  runtime: AgentRuntime,
  messages: ModelMessage[],
  handoffs: RunHandoffs
) {
  let progressed = false

  for (const approval of handoffs.approvals) {
    if (await reconcileApproval(runtime, messages, approval)) {
      progressed = true
    }
  }

  for (const offer of handoffs.offers) {
    if (await reconcileOffer(runtime, messages, offer)) {
      progressed = true
    }
  }

  return {
    pending: pendingHandoffs(handoffs),
    progressed,
  }
}

async function reconcileApproval(
  runtime: AgentRuntime,
  messages: ModelMessage[],
  approval: ApprovalHandoff
) {
  if (isPendingApproval(approval)) {
    return false
  }

  await recordApprovalResolved(runtime, approval)

  if (approval.status === "approved") {
    await executeApprovedAction(runtime, messages, approval)
    return true
  }

  await runtime.platform.markApprovalConsumed({ approvalId: approval.id })
  messages.push(userNote(approvalOutcomeNote(approval)))

  return true
}

async function executeApprovedAction(
  runtime: AgentRuntime,
  messages: ModelMessage[],
  approval: ApprovalHandoff
) {
  const encoded = await runtime.platform.executeApproval({
    approvalId: approval.id,
    runId: runtime.context.run.id,
  })
  const result = await materializeSandboxResult(runtime, decodeJson(encoded))

  markVisibleCommunication(runtime, approval.tool, result)
  messages.push(
    userNote(
      `Approved action \`${approval.tool}\` (${approval.code}) ran. Result: ${encodeToolResult(result)}`
    )
  )
}

async function reconcileOffer(
  runtime: AgentRuntime,
  messages: ModelMessage[],
  offer: OfferHandoff
) {
  if (isPendingOffer(offer)) {
    return false
  }

  await recordOfferResolved(runtime, offer)
  await runtime.platform.markOfferConsumed({ integrationOfferId: offer.id })

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
  runtime: AgentRuntime,
  messages: ModelMessage[]
) {
  const reloaded = await runtime.platform.reloadContext({
    runId: runtime.context.run.id,
  })

  const previous = runtime.context.prompt

  runtime.context.tools = reloaded.tools
  runtime.context.activeSurface = reloaded.activeSurface
  runtime.context.prompt = reloaded.prompt

  replacePromptMessages(messages, previous, reloaded.prompt)
}

function pendingHandoffs(handoffs: RunHandoffs): PendingHandoff[] {
  const approvals = handoffs.approvals
    .filter(isPendingApproval)
    .map((approval) =>
      pendingHandoff({ id: approval.id, kind: "approval" }, approval.expiresAt)
    )
  const offers = handoffs.offers
    .filter(isPendingOffer)
    .map((offer) =>
      pendingHandoff({ id: offer.id, kind: "offer" }, offer.expiresAt)
    )

  return [...approvals, ...offers]
}

function pendingHandoff(
  subject: HandoffSubject,
  expiresAt: number
): PendingHandoff {
  return { expiresAt, subject }
}

async function loadSubjectHandoffs(
  runtime: AgentRuntime,
  subjects: HandoffSubject[]
) {
  return subjects.length === 0
    ? emptyHandoffs()
    : await runtime.platform.loadRunHandoffSubjects({ subjects })
}

function mergeHandoffs(primary: RunHandoffs, secondary: RunHandoffs) {
  return {
    approvals: mergeById(primary.approvals, secondary.approvals),
    offers: mergeById(primary.offers, secondary.offers),
  }
}

function mergeById<Item extends { id: string }>(
  primary: Item[],
  secondary: Item[]
) {
  const seen = new Set<string>()
  const merged: Item[] = []

  for (const item of [...primary, ...secondary]) {
    if (!seen.has(item.id)) {
      seen.add(item.id)
      merged.push(item)
    }
  }

  return merged
}

function emptyHandoffs(): RunHandoffs {
  return { approvals: [], offers: [] }
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
