import { internal } from "../../_generated/api"
import { type ActionCtx } from "../../_generated/server"
import { updateSlackMessage } from "../../broker/tools/slack"
import {
  getSlackChannelId,
  getSlackMessageTs,
  getSlackThreadTs,
} from "../../providers/slack/data"
import { getSlackActorProfile } from "../../providers/slack/directory/users"
import { createIntegrationActor } from "../../shared/actor"
import { decideSlackApproval } from "../runtime"
import {
  createSlackDecisionResponse,
  type SlackApprovalInteraction,
} from "./blocks"

type SlackApprovalDecisionInput = {
  accountId: string
  actorId?: string
  actorEmail?: string
  actorName?: string
  text?: string
  data: unknown
}

export function isSlackApprovalDecisionText(text: string | undefined) {
  return parseApprovalDecision(text) !== null
}

export async function handleSlackApprovalDecision(
  ctx: ActionCtx,
  input: SlackApprovalDecisionInput
) {
  const approvalDecision = parseApprovalDecision(input.text)

  if (approvalDecision === null) {
    return false
  }

  const channelId = getSlackChannelId(input.data)

  if (channelId === undefined) {
    return true
  }

  await ctx.scheduler.runAfter(
    0,
    internal.approvals.runtime.handleSlackDecision,
    {
      accountId: input.accountId,
      actor: createIntegrationActor({
        externalId: input.actorId,
        email: input.actorEmail,
        name: input.actorName,
      }),
      channelId,
      threadTs: getSlackThreadTs(input.data) ?? getSlackMessageTs(input.data),
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
    return okResponse()
  }

  const result = await decideSlackApproval(ctx, {
    accountId: interaction.accountId,
    actor: await createSlackApprovalActor(ctx, {
      accountId: interaction.accountId,
      actorId: interaction.actorId,
    }),
    channelId: interaction.channelId,
    threadTs: interaction.threadTs,
    code: interaction.code,
    decision: interaction.decision,
  })
  const response = createSlackDecisionResponse(interaction, result)

  if (result.integration !== undefined) {
    await updateSlackMessage(result.integration, {
      channel: interaction.channelId,
      ts: interaction.messageTs,
      text: response.text,
      blocks: response.blocks,
    })
  }

  return okResponse()
}

export async function createSlackApprovalActor(
  ctx: ActionCtx,
  args: {
    accountId: string
    actorId: string | undefined
    actorEmail?: string
    actorName?: string
  }
) {
  const profile = await getSlackActorProfile(ctx, {
    accountId: args.accountId,
    actorId: args.actorId,
  })

  return createIntegrationActor({
    externalId: args.actorId,
    email: profile?.email ?? args.actorEmail,
    name: profile?.name ?? args.actorName,
  })
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
  const messageTs = readNestedString(payload.message, "ts")

  if (
    code === null ||
    accountId === null ||
    channelId === null ||
    messageTs === null
  ) {
    return null
  }

  return {
    accountId,
    actorId: actorId ?? undefined,
    channelId,
    messageTs,
    threadTs: readNestedString(payload.message, "thread_ts") ?? messageTs,
    code,
    decision,
  } satisfies SlackApprovalInteraction
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

function okResponse() {
  return new Response(null, { status: 200 })
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
