import { microsoftGraphUrl } from "./config"
import { acquireMicrosoftApplicationToken } from "./oauth"
import { parseTeamsMessageResource } from "./resources"

export type MicrosoftGraphNotificationPayload = {
  value?: MicrosoftGraphNotification[]
}

type MicrosoftGraphNotification = {
  changeType?: string
  clientState?: string
  resource?: string
  resourceData?: {
    id?: string
    "@odata.type"?: string
  }
  subscriptionId?: string
  tenantId?: string
}

type MicrosoftChatMessage = {
  id?: string
  createdDateTime?: string
  body?: {
    content?: string
    contentType?: string
  }
  from?: {
    user?: {
      id?: string
      displayName?: string
      userIdentityType?: string
    }
    application?: {
      id?: string
      displayName?: string
    }
  }
  mentions?: Array<{
    id?: number
    mentionText?: string
    mentioned?: {
      user?: {
        id?: string
        displayName?: string
      }
      application?: {
        id?: string
        displayName?: string
      }
    }
  }>
}

export type MicrosoftObservedMessage = {
  accountId: string
  type: string
  externalId: string
  actorId?: string
  conversationId: string
  text?: string
  observedAt?: number
  data: {
    resource: string
    subscriptionId?: string
    teamId?: string
    channelId?: string
    chatId?: string
    messageId: string
    replyId?: string
    mentions: Array<{
      id?: number
      mentionText?: string
      userId?: string
      applicationId?: string
    }>
  }
}

export async function getMicrosoftNotificationMessage(
  notification: MicrosoftGraphNotification
): Promise<MicrosoftObservedMessage | null> {
  if (
    notification.tenantId === undefined ||
    notification.resource === undefined ||
    notification.changeType !== "created"
  ) {
    return null
  }

  const target = parseTeamsMessageResource(notification.resource)

  if (target === null) {
    return null
  }

  const accessToken = await acquireMicrosoftApplicationToken(
    notification.tenantId
  )
  const message = await fetchMicrosoftChatMessage(accessToken, target.resource)

  return {
    accountId: notification.tenantId,
    type: target.type,
    externalId: `microsoft:${notification.tenantId}:${target.resource}`,
    actorId: message.from?.user?.id ?? message.from?.application?.id,
    conversationId: target.conversationId,
    text: message.body?.content,
    observedAt:
      message.createdDateTime === undefined
        ? undefined
        : Date.parse(message.createdDateTime),
    data: {
      resource: target.resource,
      subscriptionId: notification.subscriptionId,
      teamId: target.teamId,
      channelId: target.channelId,
      chatId: target.chatId,
      messageId: target.messageId,
      replyId: target.replyId,
      mentions: normalizeMentions(message.mentions),
    },
  }
}

async function fetchMicrosoftChatMessage(
  accessToken: string,
  resource: string
) {
  const response = await fetch(`${microsoftGraphUrl}/${resource}`, {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  })
  const result = (await response.json()) as MicrosoftChatMessage

  if (!response.ok) {
    throw new Error(
      `Microsoft Teams message fetch failed: ${JSON.stringify(result)}`
    )
  }

  return result
}

function normalizeMentions(mentions: MicrosoftChatMessage["mentions"]) {
  return (mentions ?? []).map((mention) => ({
    id: mention.id,
    mentionText: mention.mentionText,
    userId: mention.mentioned?.user?.id,
    applicationId: mention.mentioned?.application?.id,
  }))
}
