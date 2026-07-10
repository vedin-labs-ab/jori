import { type Doc } from "../_generated/dataModel"
import { isGitHubSelfActor } from "../providers/github/data"
import { getLinearBotId } from "../providers/linear/data"
import { getSlackBotUserId } from "../providers/slack/data"
import { type Actor, getActorExternalId, withActorKind } from "../shared/actor"

/** Mark an observed actor as "self" when it is the integration's own bot. */
export function normalizeSelfActor(
  actor: Actor | undefined,
  integration: Pick<Doc<"integrations">, "data" | "integration">
) {
  if (isGitHubSelfActor(actor, integration)) {
    return withActorKind(actor, "self")
  }

  const actorId = getActorExternalId(actor)
  const selfId = selfActorId(integration)

  return actorId !== undefined && actorId === selfId
    ? withActorKind(actor, "self")
    : actor
}

function selfActorId(
  integration: Pick<Doc<"integrations">, "data" | "integration">
) {
  if (integration.integration === "linear") {
    return getLinearBotId(integration.data)
  }

  if (integration.integration === "slack") {
    return getSlackBotUserId(integration.data)
  }

  return undefined
}
