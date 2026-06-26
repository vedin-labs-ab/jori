import { type ReactionTarget } from "../../../reactions/data"
import { type ReactionSnapshotItem } from "../../../reactions/sync"
import { createIntegrationActor } from "../../../shared/actor"
import { readRecord } from "../../../shared/input"
import { slackQueryApi } from "../api"
import { type SlackReactionSyncPlan } from "./session"

const repliesLimit = 100

export type SlackReactionSnapshot = {
  reactions: ReactionSnapshotItem[]
  target: ReactionTarget
}

export async function fetchSlackReactionSnapshots(
  token: string,
  plan: Pick<SlackReactionSyncPlan, "channelId" | "threadTs">
) {
  const result = await slackQueryApi(token, "conversations.replies", {
    channel: plan.channelId,
    limit: repliesLimit,
    ts: plan.threadTs,
  })
  const messages = Array.isArray(result?.messages) ? result.messages : []
  const snapshots: SlackReactionSnapshot[] = []

  for (const value of messages) {
    const snapshot = slackMessageReactionSnapshot(plan.channelId, value)

    if (snapshot !== null) {
      snapshots.push(snapshot)
    }
  }

  return snapshots
}

function slackMessageReactionSnapshot(
  channelId: string,
  value: unknown
): SlackReactionSnapshot | null {
  const message = readRecord(value)
  const messageTs = readString(message, "ts")

  if (messageTs === undefined) {
    return null
  }

  return {
    reactions: slackReactionItems(channelId, messageTs, message.reactions),
    target: {
      key: `slack:message:${channelId}:${messageTs}`,
      identifiers: [`slack:channel:${channelId}`, `slack:message:${messageTs}`],
    },
  }
}

function slackReactionItems(
  channelId: string,
  messageTs: string,
  value: unknown
) {
  const items: ReactionSnapshotItem[] = []
  const reactions = Array.isArray(value) ? value : []

  for (const reactionValue of reactions) {
    const reaction = readRecord(reactionValue)
    const name = readString(reaction, "name")
    const users = readStringArray(reaction.users)

    if (name === undefined) {
      continue
    }

    for (const userId of users) {
      items.push({
        actor: createIntegrationActor({
          externalId: userId,
          kind: "user",
        }),
        key: `slack:reaction:${channelId}:${messageTs}:${name}:${userId}`,
        reaction: `:${name}:`,
      })
    }
  }

  return items
}

function readString(data: Record<string, unknown>, key: string) {
  const value = data[key]

  return typeof value === "string" && value !== "" ? value : undefined
}

function readStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : []
}
