import { internal } from "../../_generated/api"
import { type ActionCtx } from "../../_generated/server"
import { decideSlackApproval } from "../../approvals/runtime"
import { type SlackBlock } from "../../tools/providers/slack"

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

export async function handleSlackApprovalInteraction(
  ctx: ActionCtx,
  payload: unknown
) {
  const interaction = parseSlackApprovalInteraction(payload)

  if (interaction === null) {
    return Response.json({ ok: true })
  }

  const result = await decideSlackApproval(ctx, {
    accountId: interaction.accountId,
    actorId: interaction.actorId,
    channelId: interaction.channelId,
    threadTs: interaction.threadTs,
    code: interaction.code,
    decision: interaction.decision,
  })

  return Response.json(createSlackDecisionResponse(interaction, result))
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

export function parseSlackApprovalInteraction(payload: unknown) {
  if (!isObject(payload) || payload.type !== "block_actions") {
    return null
  }

  const action = readFirstAction(payload.actions)
  const decision = readActionDecision(action?.action_id)

  if (action === null || decision === null) {
    return null
  }

  const code = readApprovalCode(action.value)
  const accountId = readNestedString(payload.team, "id")
  const actorId = readNestedString(payload.user, "id")
  const channelId = readNestedString(payload.channel, "id")

  if (code === null || accountId === null || channelId === null) {
    return null
  }

  return {
    accountId,
    actorId: actorId ?? undefined,
    channelId,
    threadTs:
      readNestedString(payload.message, "thread_ts") ??
      readNestedString(payload.message, "ts") ??
      undefined,
    code,
    decision,
  }
}

function readFirstAction(actions: unknown) {
  if (!Array.isArray(actions) || actions.length === 0) {
    return null
  }

  const action = actions[0]

  return isObject(action) ? action : null
}

function readActionDecision(actionId: unknown) {
  if (actionId === "milo_approval_approve") {
    return "approved" as const
  }

  if (actionId === "milo_approval_deny") {
    return "denied" as const
  }

  return null
}

function readApprovalCode(value: unknown) {
  if (typeof value !== "string" || value === "") {
    return null
  }

  try {
    const parsed = JSON.parse(value) as unknown

    if (!isObject(parsed) || typeof parsed.code !== "string") {
      return null
    }

    return parsed.code.toUpperCase()
  } catch {
    return null
  }
}

export function createSlackDecisionResponse(
  interaction: NonNullable<ReturnType<typeof parseSlackApprovalInteraction>>,
  result: Awaited<ReturnType<typeof decideSlackApproval>>
) {
  return {
    replace_original: true,
    text: createDecisionFallbackText(result),
    blocks: createDecisionBlocks(interaction, result),
  }
}

function createDecisionFallbackText(
  result: Awaited<ReturnType<typeof decideSlackApproval>>
) {
  if (result.status === "approved") {
    return "Approved. Milo is continuing the run."
  }

  if (result.status === "denied") {
    return "Denied. Milo will not run this action."
  }

  return result.message
}

function createDecisionBlocks(
  interaction: NonNullable<ReturnType<typeof parseSlackApprovalInteraction>>,
  result: Awaited<ReturnType<typeof decideSlackApproval>>
): SlackBlock[] {
  const title = getDecisionTitle(result.status, result.approval?.decision)
  const actor =
    interaction.actorId === undefined ? "" : ` by <@${interaction.actorId}>`
  const summary = result.approval?.summary
  const tool =
    result.approval === undefined
      ? undefined
      : `${result.approval.provider}.${result.approval.tool}`

  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          summary === undefined
            ? `*${title}*${actor}\n${result.message}`
            : `*${title}*${actor}\n${summary}`,
      },
    },
    ...(tool === undefined
      ? []
      : [
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `*Tool:* ${tool}`,
              },
              {
                type: "mrkdwn",
                text: result.message,
              },
            ],
          },
        ]),
  ]
}

function getDecisionTitle(
  status: Awaited<ReturnType<typeof decideSlackApproval>>["status"],
  decision?: "approved" | "denied"
) {
  if (status === "approved" || decision === "approved") {
    return "Approved"
  }

  if (status === "denied" || decision === "denied") {
    return "Denied"
  }

  if (status === "expired") {
    return "Approval expired"
  }

  return "Approval unavailable"
}

function readString(data: unknown, key: string) {
  if (typeof data !== "object" || data === null || !(key in data)) {
    return undefined
  }

  const value = data[key as keyof typeof data]

  return typeof value === "string" && value !== "" ? value : undefined
}

function readNestedString(value: unknown, key: string) {
  if (!isObject(value)) {
    return null
  }

  const child = value[key]

  return typeof child === "string" && child !== "" ? child : null
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
