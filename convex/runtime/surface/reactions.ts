import { v } from "convex/values"
import { internal } from "../../_generated/api"
import { type ActionCtx, action, internalQuery } from "../../_generated/server"
import { requireGitHubRuntimeToken } from "../../integrations/github/credentials"
import { addGitHubCommentReaction } from "../../integrations/github/delivery/comments"
import { addLinearReaction } from "../../integrations/linear/delivery/reactions"
import { prepareIntegrationForRuntime } from "../../integrations/runtime"
import { addSlackMessageReaction } from "../../integrations/slack/delivery/messages"
import { type AgentRuntimeInput } from "../../runs/agent/input"
import { requiredString } from "../../shared/input"
import { requireWorkerSecret } from "../secret"
import { requireMessageSurfaceInput } from "./input"
import { type ReactionAddress, resolveReactionAddress } from "./target"

const surfaceReactionTargetValidator = v.union(
  v.object({ messageTs: v.string() }),
  v.object({ type: v.literal("comment"), commentId: v.string() }),
  v.object({ type: v.literal("issue"), issueId: v.string() }),
  v.object({ type: v.literal("comment"), commentId: v.number() })
)

export const add = action({
  args: {
    reaction: v.string(),
    runId: v.id("runs"),
    secret: v.string(),
    target: surfaceReactionTargetValidator,
  },
  returns: v.object({
    status: v.literal("added"),
  }),
  handler: async (ctx, args) => {
    requireWorkerSecret(args.secret)

    const input = await requireMessageSurfaceInput(ctx, {
      runId: args.runId,
      surface: "reaction",
    })

    const address = (await ctx.runQuery(
      internal.runtime.surface.reactions.resolve,
      {
        messageId: input.message._id,
        target: args.target,
      }
    )) as ReactionAddress | null

    if (address === null) {
      throw new Error(
        "add_reaction target is not available in the active conversation."
      )
    }

    await sendReaction(
      ctx,
      input,
      address,
      requiredString(args.reaction, "reaction")
    )

    return { status: "added" as const }
  },
})

export const resolve = internalQuery({
  args: {
    messageId: v.id("messages"),
    target: surfaceReactionTargetValidator,
  },
  returns: v.any(),
  handler: async (ctx, args): Promise<ReactionAddress | null> => {
    const message = await ctx.db.get(args.messageId)

    return message === null
      ? null
      : await resolveReactionAddress(ctx, message, args.target)
  },
})

async function sendReaction(
  ctx: ActionCtx,
  input: Extract<AgentRuntimeInput, { type: "message" }>,
  address: ReactionAddress,
  reaction: string
) {
  const integration = await prepareIntegrationForRuntime(ctx, {
    integration: input.integration,
  })

  switch (address.type) {
    case "slack":
      await addSlackMessageReaction(integration, {
        channel: address.channel,
        name: reaction,
        timestamp: address.timestamp,
      })
      return
    case "linear":
      await addLinearReaction(integration, {
        emoji: reaction,
        target: address.target,
      })
      return
    case "github":
      await addGitHubCommentReaction(requireGitHubRuntimeToken(integration), {
        commentId: address.commentId,
        content: reaction,
        owner: address.owner,
        repo: address.repo,
        subject: address.subject,
      })
  }
}
