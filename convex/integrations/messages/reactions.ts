import { type Doc } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import {
  findReactionTargetMessage,
  type ReactionTarget,
} from "../../reactions/data"
import { normalizeSelfActor } from "./actor"
import { messageReactionTargetIdentifiers } from "./identifiers"

export async function enrichReactionTarget(
  ctx: MutationCtx,
  args: {
    integration: Doc<"integrations">
    target: ReactionTarget
  }
): Promise<ReactionTarget> {
  const message = await findReactionTargetMessage(ctx, {
    integrationId: args.integration._id,
    targetKey: args.target.key,
  })

  if (message === null) {
    return args.target
  }

  return {
    ...args.target,
    actor: normalizeSelfActor(
      args.target.actor ?? message.actor,
      args.integration
    ),
    conversationId: message.conversationId ?? args.target.conversationId,
    identifiers: mergeIdentifiers(
      args.target.identifiers,
      messageReactionTargetIdentifiers(message)
    ),
    text: args.target.text ?? message.text,
  }
}

function mergeIdentifiers(left: string[], right: string[]) {
  return [...left, ...right].filter(
    (identifier, index, values) => values.indexOf(identifier) === index
  )
}
