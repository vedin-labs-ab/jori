import { v } from "convex/values"
import { isRecord } from "../../../../contracts/json"
import { internal } from "../../../_generated/api"
import { type Doc } from "../../../_generated/dataModel"
import { type ActionCtx, internalAction } from "../../../_generated/server"
import {
  decideApprovalByAccount,
  parseApprovalDecisionText,
} from "../../../approvals/runtime"
import { actorValidator, createIntegrationActor } from "../../../shared/actor"
import { getSlackChannelId, getSlackMessageTs, getSlackThreadTs } from "../data"
import { postSlackMessage } from "../delivery/messages"
import { getSlackActorProfile } from "../directory/users"
import { readFirstAction, readNestedString } from "../ingress/actions"
import { type SlackApprovalInteraction } from "./blocks"

type SlackApprovalDecisionInput = {
  accountId: string
  actorId?: string
  actorEmail?: string
  actorName?: string
  text?: string
  data: unknown
}

export const handleDecision = internalAction({
  args: {
    accountId: v.string(),
    actor: v.optional(actorValidator),
    channelId: v.string(),
    threadTs: v.optional(v.string()),
    code: v.string(),
    decision: v.union(v.literal("approved"), v.literal("denied")),
  },
  handler: async (ctx, args) => {
    const result = await decideApprovalByAccount(ctx, {
      accountId: args.accountId,
      actor: args.actor,
      code: args.code,
      decision: args.decision,
      integration: "slack",
    })

    if (result.integration === undefined || result.status === "approved") {
      return
    }

    await postSlackDecisionMessage(result.integration, args, result.message)
  },
})

export async function handleSlackApprovalDecision(
  ctx: ActionCtx,
  input: SlackApprovalDecisionInput
) {
  const approvalDecision = parseApprovalDecisionText(input.text)

  if (approvalDecision === null) {
    return false
  }

  const channelId = getSlackChannelId(input.data)

  if (channelId === undefined) {
    return true
  }

  await ctx.scheduler.runAfter(
    0,
    internal.integrations.slack.approvals.index.handleDecision,
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

  await decideApprovalByAccount(ctx, {
    accountId: interaction.accountId,
    actor: await createSlackApprovalActor(ctx, {
      accountId: interaction.accountId,
      actorId: interaction.actorId,
    }),
    code: interaction.code,
    decision: interaction.decision,
    integration: "slack",
  })

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

export function parseSlackApprovalInteraction(payload: unknown) {
  if (!isRecord(payload) || payload.type !== "block_actions") {
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

    if (!isRecord(parsed) || typeof parsed.code !== "string") {
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

async function postSlackDecisionMessage(
  integration: Doc<"integrations">,
  args: {
    channelId: string
    threadTs?: string
  },
  text: string
) {
  await postSlackMessage(integration, {
    channel: args.channelId,
    text,
    thread_ts: args.threadTs,
  })
}
