import { internal } from "../../../_generated/api"
import { type Doc } from "../../../_generated/dataModel"
import { type ActionCtx } from "../../../_generated/server"
import { isPersonApprovalDecisionText } from "../../../approvals/runtime"
import { handleSlackApprovalDecision } from "../../../approvals/slack"
import { createIntegrationActor } from "../../../shared/actor"
import { getSlackBotUserId } from "../data"
import {
  enrichSlackMessageData,
  resolveSlackChannelNames,
} from "../directory/channels"
import { getSlackActorProfile, resolveSlackUserNames } from "../directory/users"
import { type getSlackMessage } from "./events"
import {
  humanizeSlackText,
  slackTextMentionsUser,
  unlabeledSlackChannelIds,
  unlabeledSlackUserIds,
} from "./text"

type SlackMessage = NonNullable<ReturnType<typeof getSlackMessage>>

export async function handleSlackMessageEvent(
  ctx: ActionCtx,
  message: SlackMessage
) {
  if (await handledAsApprovalDecision(ctx, message)) {
    return Response.json({ ok: true })
  }

  const integration = await ctx.runQuery(
    internal.integrations.lookup.activeByIntegrationExternal,
    { integration: "slack", externalId: message.accountId }
  )
  const [actorProfile, data, surface] = await Promise.all([
    message.actorKind === "person"
      ? getSlackActorProfile(ctx, {
          accountId: message.accountId,
          actorId: message.actorId,
        })
      : undefined,
    enrichSlackMessageData({ data: message.data, integration }),
    humanizeSlackMessage(ctx, integration, message),
  ])

  await ctx.runMutation(internal.messages.intake.record, {
    accountId: message.accountId,
    integration: "slack",
    type: message.type,
    externalId: message.externalId,
    mentioned: surface.mentioned,
    actor: createIntegrationActor({
      externalId: message.actorId,
      aliases: message.actorAliases,
      kind: message.actorKind,
      email: actorProfile?.email,
      name: actorProfile?.name,
    }),
    conversationId: message.conversationId,
    text: surface.text,
    observedAt: message.observedAt,
    data,
  })

  return Response.json({ ok: true })
}

async function handledAsApprovalDecision(
  ctx: ActionCtx,
  message: SlackMessage
) {
  if (
    !isPersonApprovalDecisionText({
      actorKind: message.actorKind,
      text: message.text,
    })
  ) {
    return false
  }

  const actorProfile = await getSlackActorProfile(ctx, {
    accountId: message.accountId,
    actorId: message.actorId,
  })

  return await handleSlackApprovalDecision(ctx, {
    accountId: message.accountId,
    actorId: message.actorId,
    actorEmail: actorProfile?.email,
    actorName: actorProfile?.name,
    text: message.text,
    data: message.data,
  })
}

// Provider syntax stops here: the recorded text is human-readable, and
// mention detection happens against the raw payload before it is rewritten.
async function humanizeSlackMessage(
  ctx: ActionCtx,
  integration: Doc<"integrations"> | null,
  message: SlackMessage
): Promise<{ mentioned: boolean; text: string | undefined }> {
  if (message.text === undefined || integration === null) {
    return { mentioned: message.mentioned, text: message.text }
  }

  const botUserId = getSlackBotUserId(integration.data)
  const mentioned =
    message.mentioned ||
    (botUserId !== undefined && slackTextMentionsUser(message.text, botUserId))
  const [users, channels] = await Promise.all([
    resolveSlackUserNames(ctx, {
      integration,
      userIds: unlabeledSlackUserIds(message.text).filter(
        (userId) => userId !== botUserId
      ),
    }),
    resolveSlackChannelNames(
      integration,
      unlabeledSlackChannelIds(message.text)
    ),
  ])

  if (botUserId !== undefined) {
    users.set(botUserId, "Milo")
  }

  return {
    mentioned,
    text: humanizeSlackText(message.text, { channels, users }),
  }
}
