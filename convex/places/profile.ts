import { v } from "convex/values"
import { promptTemplates } from "../../prompts/generated"
import { renderPromptTemplate } from "../../prompts/render"
import { internal } from "../_generated/api"
import { internalAction } from "../_generated/server"
import { requestStructured } from "../model/structured"
import { profileOutputTokens } from "./limits"
import { parseProfileReview, profileReviewSchema } from "./parse"
import { type PendingProfile } from "./window"

const profileModel = "openai/gpt-5.5"

export const run = internalAction({
  args: { placeId: v.id("places") },
  handler: async (ctx, args) => {
    const pending = (await ctx.runQuery(
      internal.places.window.pending,
      args
    )) as PendingProfile | null

    if (pending === null || pending.messages.length === 0) {
      await ctx.runMutation(internal.places.window.clear, args)
      return null
    }

    const review = parseProfileReview(
      await requestReview(pending),
      pending.claims.length
    )

    await ctx.runMutation(internal.places.window.commit, {
      placeId: pending.placeId,
      profiledAt: pending.profiledAt,
      windowSize: pending.messages.length,
      reviews: review.reviews,
      additions: review.additions,
    })

    return null
  },
})

async function requestReview(pending: PendingProfile) {
  return await requestStructured({
    model: profileModel,
    // Calibrated judgment against explicit bars, closer to the deduction
    // judge (high) than to the conversation summarizer (low).
    reasoning: "medium",
    schemaName: "place_profile_review",
    schema: profileReviewSchema,
    system: renderPromptTemplate(promptTemplates["places/profile"], {}),
    user: JSON.stringify(reviewPayload(pending)),
    maxTokens: profileOutputTokens,
  })
}

function reviewPayload(pending: PendingProfile) {
  return {
    place: { name: pending.name, kind: pending.kind },
    claims: pending.claims.map((claim, index) => ({
      index: index + 1,
      section: claim.section,
      text: claim.text,
    })),
    messages: pending.messages.map((message) => ({
      at: new Date(message.observedAt ?? message.createdAt).toISOString(),
      actor: message.actor,
      kind: message.speaker,
      text: message.text,
      ...(message.reactions === null ? {} : { reactions: message.reactions }),
    })),
  }
}
