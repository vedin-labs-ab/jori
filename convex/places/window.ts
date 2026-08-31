import { v } from "convex/values"
import { placeKinds } from "../../contracts/places"
import { type Doc, type Id } from "../_generated/dataModel"
import {
  internalMutation,
  internalQuery,
  type QueryCtx,
} from "../_generated/server"
import { reactionSummariesForMessages } from "../reactions/summary"
import { getActorDisplayName, getActorKind } from "../shared/actor"
import { applyProfileReview } from "./claims"
import { profileWindowMessageLimit } from "./limits"
import { type PlaceClaim, placeSection } from "./schema"

export type ProfileMessage = {
  actor: string
  createdAt: number
  observedAt: number | null
  reactions: string | null
  speaker: string
  text: string
}

export type PendingProfile = {
  placeId: Id<"places">
  name: string
  // Surface-native noun ("channel", "repository", "team") so the profiler
  // judges "true of most places of this kind" against the right baseline.
  kind: string
  claims: PlaceClaim[]
  messages: ProfileMessage[]
  // Watermark for the commit: createdAt of the newest message in the window.
  profiledAt: number
}

export const pending = internalQuery({
  args: { placeId: v.id("places") },
  handler: async (ctx, args): Promise<PendingProfile | null> => {
    const place = await ctx.db.get(args.placeId)

    if (place === null) {
      return null
    }

    const kind = await placeKindNoun(ctx, place)
    const rows = await windowRows(ctx, place)
    const newest = rows.at(-1)

    if (kind === null || newest === undefined) {
      return null
    }

    return {
      placeId: place._id,
      name: place.name,
      kind,
      claims: place.claims,
      messages: await profileMessages(ctx, rows),
      profiledAt: newest.createdAt,
    }
  },
})

async function placeKindNoun(ctx: QueryCtx, place: Doc<"places">) {
  const integration = await ctx.db.get(place.integrationId)

  if (integration === null) {
    return null
  }

  const kind =
    integration.integration in placeKinds
      ? placeKinds[integration.integration as keyof typeof placeKinds]
      : undefined

  return kind?.noun ?? null
}

export const commit = internalMutation({
  args: {
    placeId: v.id("places"),
    profiledAt: v.number(),
    windowSize: v.number(),
    reviews: v.array(
      v.object({
        verdict: v.union(
          v.literal("confirmed"),
          v.literal("contradicted"),
          v.literal("revised"),
          v.literal("unmentioned")
        ),
        text: v.string(),
      })
    ),
    additions: v.array(v.object({ section: placeSection, text: v.string() })),
  },
  handler: async (ctx, args) => {
    const place = await ctx.db.get(args.placeId)

    if (place === null) {
      return
    }

    await ctx.db.patch(place._id, {
      claims: applyProfileReview({
        claims: place.claims,
        review: { reviews: args.reviews, additions: args.additions },
        windowSize: args.windowSize,
        now: Date.now(),
      }),
      profiledAt: args.profiledAt,
      debounce: undefined,
    })
  },
})

export const clear = internalMutation({
  args: { placeId: v.id("places") },
  handler: async (ctx, args) => {
    const place = await ctx.db.get(args.placeId)

    if (place === null) {
      return
    }

    await ctx.db.patch(place._id, { debounce: undefined })
  },
})

async function windowRows(ctx: QueryCtx, place: Doc<"places">) {
  const rows = await ctx.db
    .query("messages")
    .withIndex("by_place_and_created_at", (query) => {
      const scoped = query.eq("placeId", place._id)

      return place.profiledAt === undefined
        ? scoped
        : scoped.gt("createdAt", place.profiledAt)
    })
    .order("desc")
    .take(profileWindowMessageLimit)

  return rows.reverse()
}

async function profileMessages(
  ctx: QueryCtx,
  rows: Doc<"messages">[]
): Promise<ProfileMessage[]> {
  const reactions = await reactionSummariesForMessages(ctx, rows)

  return rows.flatMap((message) => {
    const text = (message.text ?? "").trim()

    if (text === "") {
      return []
    }

    return [
      {
        actor: getActorDisplayName(message.actor) ?? "unknown",
        createdAt: message.createdAt,
        observedAt: message.observedAt ?? null,
        reactions: reactions.get(message._id) ?? null,
        speaker: getActorKind(message.actor),
        text,
      },
    ]
  })
}
