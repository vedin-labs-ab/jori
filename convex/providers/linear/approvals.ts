import { type ActionCtx } from "../../_generated/server"
import {
  decideApprovalByAccount,
  parseApprovalDecisionText,
} from "../../approvals/runtime"
import { createIntegrationActor } from "../../shared/actor"

type LinearApprovalMessage = {
  accountId: string
  actorEmail?: string
  actorId?: string
  actorKind: "bot" | "user"
  actorName?: string
  text?: string
}

export async function handleLinearApprovalDecision(
  ctx: ActionCtx,
  message: LinearApprovalMessage
) {
  if (message.actorKind !== "user") {
    return false
  }

  const command = parseApprovalDecisionText(message.text)

  if (command === null) {
    return false
  }

  await decideApprovalByAccount(ctx, {
    accountId: message.accountId,
    actor: createIntegrationActor({
      email: message.actorEmail,
      externalId: message.actorId,
      kind: message.actorKind,
      name: message.actorName,
    }),
    code: command.code,
    decision: command.decision,
    integration: "linear",
  })

  return true
}
