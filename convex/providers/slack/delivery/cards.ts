import { type Doc } from "../../../_generated/dataModel"
import { readString } from "../../../shared/input"
import { getSlackChannelId, getSlackMessageTs, getSlackThreadTs } from "../data"
import { postSlackMessage, type SlackBlock } from "./messages"

export type SlackCardTarget = {
  channelId: string
  threadTs?: string
}

// The channel and thread a status card about this message should land in:
// the message's thread when one exists, otherwise the message itself.
export function slackCardTarget(data: unknown): SlackCardTarget | null {
  const channelId = getSlackChannelId(data)

  if (channelId === undefined) {
    return null
  }

  return {
    channelId,
    threadTs: getSlackThreadTs(data) ?? getSlackMessageTs(data),
  }
}

// Posts a status card (approval prompt, integration offer) and returns the
// delivery record used to update the card in place on later transitions.
export async function postSlackCard(
  integration: Doc<"integrations">,
  target: SlackCardTarget,
  card: {
    blocks?: SlackBlock[]
    label: string
    text: string
  }
) {
  const response = await postSlackMessage(integration, {
    channel: target.channelId,
    thread_ts: target.threadTs,
    text: card.text,
    blocks: card.blocks,
  })
  const messageTs = readString(response, "ts")

  if (messageTs === undefined) {
    throw new Error(`Slack ${card.label} response is missing ts`)
  }

  return {
    delivery: {
      integration: "slack" as const,
      integrationId: integration._id,
      data: {
        channelId: readString(response, "channel") ?? target.channelId,
        messageTs,
        ...(target.threadTs === undefined ? {} : { threadTs: target.threadTs }),
      },
    },
    messageTs,
  }
}
