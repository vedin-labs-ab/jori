import { type ActionCtx } from "../../../_generated/server"
import {
  handlePersonTextApprovalDecision,
  isPersonApprovalDecisionText,
} from "../../../approvals/runtime"
import { createIntegrationActor } from "../../../shared/actor"

type LinearApprovalMessage = {
  accountId: string
  actorEmail?: string
  actorId?: string
  actorKind: "bot" | "person"
  actorName?: string
  text?: string
}

export async function handleLinearApprovalDecision(
  ctx: ActionCtx,
  message: LinearApprovalMessage
) {
  return await handlePersonTextApprovalDecision(ctx, {
    accountId: message.accountId,
    actor: createIntegrationActor({
      email: message.actorEmail,
      externalId: message.actorId,
      kind: message.actorKind,
      name: message.actorName,
    }),
    integration: "linear",
    actorKind: message.actorKind,
    text: message.text,
  })
}

export function isLinearApprovalDecision(message: LinearApprovalMessage) {
  return isPersonApprovalDecisionText({
    actorKind: message.actorKind,
    text: message.text,
  })
}
