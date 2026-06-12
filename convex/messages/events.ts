import { type Doc } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { recordEvent } from "../events/data"
import { getSlackChannelId } from "../providers/slack/data"
import { type Actor } from "../shared/actor"

type AutomationEventMessage = {
  externalId: string
  actor?: Actor
  text?: string
  data?: unknown
  observedAt?: number
}

export async function recordAutomationEvent(
  ctx: MutationCtx,
  input: {
    integration: Doc<"integrations">
    message: AutomationEventMessage
    now: number
  }
) {
  if (input.integration.provider !== "slack") {
    return
  }

  const channelId = getSlackChannelId(input.message.data)

  if (channelId === undefined) {
    return
  }

  await recordEvent(ctx, {
    integration: input.integration,
    key: input.message.externalId,
    type: "message.created",
    resource: channelId,
    actor: input.message.actor,
    text: input.message.text,
    data: input.message.data,
    observedAt: input.message.observedAt,
    now: input.now,
  })
}
