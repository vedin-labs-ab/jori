import { internal } from "../../_generated/api"
import { type ActionCtx } from "../../_generated/server"

type SlackApprovalDecisionInput = {
  accountId: string
  actorId?: string
  actorEmail?: string
  text?: string
  data: unknown
}

export async function handleSlackApprovalDecision(
  ctx: ActionCtx,
  input: SlackApprovalDecisionInput
) {
  const approvalDecision = parseApprovalDecision(input.text)

  if (approvalDecision === null) {
    return false
  }

  const channelId = readString(input.data, "channelId")

  if (channelId === undefined) {
    return true
  }

  await ctx.scheduler.runAfter(
    0,
    internal.approvals.runtime.handleSlackDecision,
    {
      accountId: input.accountId,
      actorId: input.actorId,
      actorEmail: input.actorEmail,
      channelId,
      threadTs:
        readString(input.data, "threadTs") ?? readString(input.data, "ts"),
      code: approvalDecision.code,
      decision: approvalDecision.decision,
    }
  )

  return true
}

function parseApprovalDecision(text: string | undefined) {
  const match = text?.match(/^\s*(approve|deny)\s+([A-Za-z0-9]{6,})\s*$/i)

  if (match === undefined || match === null) {
    return null
  }

  return {
    decision: match[1].toLowerCase() === "approve" ? "approved" : "denied",
    code: match[2].toUpperCase(),
  } as const
}

function readString(data: unknown, key: string) {
  if (typeof data !== "object" || data === null || !(key in data)) {
    return undefined
  }

  const value = data[key as keyof typeof data]

  return typeof value === "string" && value !== "" ? value : undefined
}
