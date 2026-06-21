import { type MessageRoutingContext } from "./context"
import { type RoutingConversationEntry } from "./history"

export function createRoutingPayload(context: MessageRoutingContext) {
  return {
    surface: context.integration,
    run: routingPayloadRun(context.activeRun),
    message: routingPayloadMessage(context.currentMessage),
    addressing: {
      isDirect: context.isDirect,
      isMentioned: context.isMentioned,
      isAddressed: context.isAddressed,
    },
    context: {
      history: routingPayloadHistory(context),
    },
  }
}

function routingPayloadHistory(context: MessageRoutingContext) {
  return context.recentMessages
    .filter((entry) => entry.id !== context.currentMessage.id)
    .map(routingPayloadMessage)
}

function routingPayloadMessage(entry: RoutingConversationEntry) {
  return {
    id: entry.id,
    text: entry.text,
    createdAt: entry.createdAt,
    observedAt: entry.observedAt,
    author: {
      kind: entry.source,
      name: entry.actor,
    },
  }
}

function routingPayloadRun(run: MessageRoutingContext["activeRun"]) {
  if (run === null) {
    return null
  }

  return {
    id: run.runId,
    status: run.status,
    latestStatus: run.latestStatus,
  }
}
