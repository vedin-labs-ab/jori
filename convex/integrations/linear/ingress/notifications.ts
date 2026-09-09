import { type Doc } from "../../../_generated/dataModel"
import { readRecord, readString } from "../../../shared/input"
import { requireLinearCredentials } from "../credentials"
import { linearGraphql } from "../graphql"
import {
  type getLinearCommentMessage,
  type LinearWebhookPayload,
} from "./events"

export function getLinearNotificationMessage(
  payload: LinearWebhookPayload,
  accountId: string,
  deliveryId: string | null,
  normalizeComment: typeof getLinearCommentMessage
) {
  if (
    !["issueCommentMention", "issueNewComment", "issueMention"].includes(
      payload.action ?? ""
    )
  ) {
    return null
  }
  const notification = readRecord(payload.notification)
  const comment = readRecord(notification.comment)
  const issue = readRecord(notification.issue)
  const issueId = readString(issue, "id") ?? readString(notification, "issueId")
  const issueMention = payload.action === "issueMention"
  const commentId =
    readString(comment, "id") ?? readString(notification, "commentId")
  if (issueId === undefined || (!issueMention && commentId === undefined)) {
    return null
  }
  const actor = readNotificationActor(notification, payload)
  const message = normalizeComment(
    {
      ...payload,
      type: "Comment",
      action: "create",
      actor,
      data: {
        ...comment,
        id: issueMention ? issueId : commentId,
        issueId,
        body: issueMention
          ? readString(issue, "description")
          : readString(comment, "body"),
        issue,
      },
    },
    accountId,
    deliveryId
  )
  if (message === null) {
    return null
  }
  return {
    ...message,
    type: issueMention ? "issue.mention" : message.type,
    externalId: issueMention
      ? `linear:${accountId}:mention:${deliveryId ?? readString(notification, "id") ?? issueId}`
      : message.externalId,
    appUserId: payload.appUserId,
    mentioned: payload.action !== "issueNewComment",
    data: {
      ...message.data,
      action: issueMention ? undefined : message.data.action,
      eventType: payload.type,
      commentId: issueMention ? undefined : commentId,
    },
  }
}

function readNotificationActor(
  notification: Record<string, unknown>,
  payload: LinearWebhookPayload
) {
  const actor = readRecord(notification.actor)
  return {
    id: readString(actor, "id") ?? payload.actor?.id,
    type: readString(actor, "type") ?? payload.actor?.type ?? "user",
    name: readString(actor, "name") ?? payload.actor?.name,
    email: readString(actor, "email") ?? payload.actor?.email,
  }
}

export async function hydrateLinearNotification(
  integration: Doc<"integrations">,
  payload: LinearWebhookPayload
): Promise<LinearWebhookPayload> {
  if (payload.type !== "AppUserNotification") {
    return payload
  }
  const notification = readRecord(payload.notification)
  const comment = readRecord(notification.comment)
  const issue = readRecord(notification.issue)
  const issueMention = payload.action === "issueMention"
  const field = issueMention ? "issue" : "comment"
  const id =
    readString(issueMention ? issue : comment, "id") ??
    readString(notification, `${field}Id`)
  if (
    id === undefined ||
    !["issueMention", "issueCommentMention", "issueNewComment"].includes(
      payload.action ?? ""
    )
  ) {
    return payload
  }
  if (
    readString(
      issueMention ? issue : comment,
      issueMention ? "description" : "body"
    ) !== undefined
  ) {
    return payload
  }
  const result = await linearGraphql<{ data?: Record<string, unknown> }>(
    requireLinearCredentials(integration).tokens.access,
    {
      query: issueMention
        ? `query JoriNotificationIssue($id: String!) { issue(id: $id) { id description identifier title url team { id } project { id } } }`
        : `query JoriNotificationComment($id: String!) { comment(id: $id) { id body parent { id } user { id name email } issue { id identifier title url team { id } project { id } } } }`,
      variables: { id },
    }
  )
  const entity = readRecord(result.data?.[field])
  return {
    ...payload,
    notification: {
      ...notification,
      [field]: entity,
      issue: issueMention ? entity : { ...readRecord(entity.issue), ...issue },
      actor: notification.actor ?? payload.actor ?? entity.user,
    },
  }
}
