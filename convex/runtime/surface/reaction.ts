import { type Doc } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"
import { callLinearTool } from "../../broker/tools/linear"
import { callSlackTool } from "../../broker/tools/slack/index"
import { prepareIntegrationForRuntime } from "../../integrations/runtime"
import { type ReactionAddress } from "../../messages/surface"
import { type AgentRuntimeInput } from "../../runs/agent/input"

export async function addSurfaceReaction(
  ctx: ActionCtx,
  input: Extract<AgentRuntimeInput, { type: "message" }>,
  address: ReactionAddress,
  args: {
    emoji: string
  }
) {
  const integration = await prepareIntegrationForRuntime(ctx, {
    integration: input.integration,
  })

  if (address.type === "slack") {
    await callSlackTool(integration, "conversations_add_reaction", {
      channel: address.channelId,
      name: args.emoji,
      timestamp: address.messageTs,
    })
    return
  }

  await addLinearReaction(integration, address, args.emoji)
}

async function addLinearReaction(
  integration: Doc<"integrations">,
  address: Extract<ReactionAddress, { type: "linear" }>,
  emoji: string
) {
  await callLinearTool(integration, "linear_add_reaction", {
    emoji,
    ...linearReactionTarget(address),
  })
}

function linearReactionTarget(
  address: Extract<ReactionAddress, { type: "linear" }>
) {
  if (address.commentId !== undefined) {
    return { commentId: address.commentId }
  }

  if (address.issueId !== undefined) {
    return { issueId: address.issueId }
  }

  throw new Error("Run has no active reaction target.")
}
