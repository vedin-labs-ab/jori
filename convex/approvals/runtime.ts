import { v } from "convex/values"
import { internal } from "../_generated/api"
import { type Doc } from "../_generated/dataModel"
import { type ActionCtx, internalAction } from "../_generated/server"
import { type Actor } from "../shared/actor"
import { type Integration, integrationLabel } from "../shared/integrations"
import { type ApprovalDecisionResult, approvalDecisionMessage } from "./result"

export type ApprovalDecision = "approved" | "denied"

export type AccountApprovalDecisionArgs = {
  accountId: string
  actor?: Actor
  integration: Integration
  code: string
  decision: ApprovalDecision
}

export type TextApprovalDecisionArgs = {
  accountId: string
  actor?: Actor
  actorKind?: Actor["kind"]
  integration: Integration
  text?: string
}

export const expireApproval = internalAction({
  args: {
    approvalId: v.id("approvals"),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(internal.approvals.approvals.expire, {
      approvalId: args.approvalId,
    })
  },
})

export function isPersonApprovalDecisionText(args: {
  actorKind?: Actor["kind"]
  text?: string
}) {
  return parsePersonApprovalDecisionText(args) !== null
}

export async function handlePersonTextApprovalDecision(
  ctx: ActionCtx,
  args: TextApprovalDecisionArgs
) {
  const command = parsePersonApprovalDecisionText(args)

  if (command === null) {
    return false
  }

  await decideApprovalByAccount(ctx, {
    accountId: args.accountId,
    actor: args.actor,
    code: command.code,
    decision: command.decision,
    integration: args.integration,
  })

  return true
}

export function parseApprovalDecisionText(text: string | undefined) {
  const commandText = normalizeApprovalDecisionText(text)
  const match = commandText?.match(/^(approve|deny)\s+([A-Za-z0-9]{6,})$/i)

  if (match === undefined || match === null) {
    return null
  }

  return {
    decision: match[1].toLowerCase() === "approve" ? "approved" : "denied",
    code: normalizeApprovalCode(match[2]),
  } as const
}

function parsePersonApprovalDecisionText(args: {
  actorKind?: Actor["kind"]
  text?: string
}) {
  if (args.actorKind !== "person") {
    return null
  }

  return parseApprovalDecisionText(args.text)
}

function normalizeApprovalDecisionText(text: string | undefined) {
  let current = text?.trim()

  if (current === undefined || current === "") {
    return null
  }

  for (let attempts = 0; attempts < 4; attempts += 1) {
    const next = stripApprovalFormatting(current).trim()

    if (next === current) {
      return current
    }

    current = next
  }

  return current
}

function stripApprovalFormatting(text: string) {
  const unpunctuated = text.replace(/[.!?]+\s*$/, "")

  return (
    stripCodeFence(unpunctuated) ??
    stripInlineCode(unpunctuated) ??
    stripQuotes(unpunctuated) ??
    unpunctuated
  )
}

function stripCodeFence(text: string) {
  return text.match(/^```[A-Za-z0-9_-]*\n([\s\S]*?)\n?```$/)?.[1] ?? null
}

function stripInlineCode(text: string) {
  return text.match(/^(`{1,3})([^`\n]+)\1$/)?.[2] ?? null
}

function stripQuotes(text: string) {
  const match = text.match(/^(["'])([\s\S]*?)\1$/)

  return match?.[2] ?? null
}

export async function decideApprovalByAccount(
  ctx: ActionCtx,
  args: AccountApprovalDecisionArgs
): Promise<ApprovalDecisionResult> {
  const target = await ctx.runQuery(
    internal.approvals.queries.getDecisionTarget,
    {
      accountId: args.accountId,
      code: normalizeApprovalCode(args.code),
      integration: args.integration,
    }
  )

  if (target === null) {
    return {
      status: "missing",
      message: approvalDecisionMessage("missing"),
    }
  }

  if (target.approval === null) {
    return {
      status: "missing",
      integration: target.integration,
      message: approvalDecisionMessage("missing"),
    }
  }

  if (args.actor === undefined) {
    return {
      status: "missing",
      integration: target.integration,
      approval: target.approval,
      message: `Couldn't identify the ${integrationLabel(args.integration)} user, so the decision wasn't recorded.`,
    }
  }

  return await decideApproval(ctx, {
    approval: target.approval,
    decidedBy: args.actor,
    decision: args.decision,
    integration: target.integration,
  })
}

export async function decideApproval(
  ctx: ActionCtx,
  args: {
    approval: Doc<"approvals">
    decidedBy: Actor
    decision: ApprovalDecision
    integration?: Doc<"integrations">
  }
): Promise<ApprovalDecisionResult> {
  const result = await ctx.runMutation(internal.approvals.approvals.decide, {
    approvalId: args.approval._id,
    decision: args.decision,
    decidedBy: args.decidedBy,
  })

  return {
    status: result.status,
    integration: args.integration,
    approval: result.approval,
    message: approvalDecisionMessage(result.status, result.approval),
  }
}

function normalizeApprovalCode(code: string) {
  return code.trim().toUpperCase()
}
