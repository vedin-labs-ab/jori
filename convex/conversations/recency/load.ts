import { type Doc, type Id } from "../../_generated/dataModel"
import { type QueryCtx } from "../../_generated/server"
import { messageIdentifiers } from "../../integrations/messages/identifiers"
import { type Audience } from "../../shared/audience"
import { createSight, type Sight } from "../../visibility/sight"
import { conversationGate, createConversationSight } from "../access"
import {
  recencyConversationLimit,
  recencyMessageLimit,
  recencyWindowMs,
} from "../limits"
import { findMessageConversation } from "../resolve"
import { canIncludeRecentConversation } from "../scope"

export type RecencyRun = {
  conversationId: Id<"conversations"> | undefined
  personId: Id<"persons"> | undefined
  audience: Audience | undefined
}

type RecencySummary = {
  kind: "summary"
  ageMs: number
  conversationId: Id<"conversations">
  identifiers: string[]
  surface: Doc<"messages">["surface"]
  summary: string
}

type RecencyReference = {
  kind: "reference"
  conversationId: Id<"conversations">
  identifiers: string[]
  surface: Doc<"messages">["surface"]
}

export type RecencyEntry = RecencyReference | RecencySummary

// Loads privacy-scoped recent-conversation context for one person within the
// current run. Both personId and run.personId must be canonical person ids.
// Conversations listed in args.seen were already summarized earlier in this
// run and come back as references instead of repeated summaries.
export async function loadRecentActivity(
  ctx: QueryCtx,
  args: {
    now: number
    personId: Id<"persons">
    run: RecencyRun
    seen: Id<"conversations">[]
    organizationId: string
  }
): Promise<RecencyEntry[]> {
  const messages = await recentPersonMessages(ctx, args)
  const seen = new Set(args.seen)
  const visited = new Set<Id<"conversations">>()
  const personal = args.personId === args.run.personId
  const sight = await recentSight(ctx, args.run, args.organizationId, personal)
  const entries: RecencyEntry[] = []
  let summaries = 0

  for (const message of messages) {
    const conversation = await findMessageConversation(ctx, message)

    if (!isCandidate(conversation, args, visited)) {
      continue
    }

    visited.add(conversation._id)

    const includable = await canIncludeConversation(
      conversation,
      args.run,
      personal,
      sight
    )

    if (!includable) {
      continue
    }

    if (seen.has(conversation._id)) {
      entries.push(referenceEntry(conversation, message))
      continue
    }

    if (summaries < recencyConversationLimit && hasSummary(conversation)) {
      entries.push(summaryEntry(conversation, message, args.now))
      summaries += 1
    }
  }

  return entries
}

function isCandidate(
  conversation: Doc<"conversations"> | null,
  args: { run: RecencyRun; organizationId: string },
  visited: Set<Id<"conversations">>
): conversation is Doc<"conversations"> {
  return (
    conversation !== null &&
    conversation.organizationId === args.organizationId &&
    conversation._id !== args.run.conversationId &&
    !visited.has(conversation._id)
  )
}

function hasSummary(
  conversation: Doc<"conversations">
): conversation is Doc<"conversations"> & {
  summarizedAt: number
  summary: string
} {
  return (
    conversation.summary !== undefined &&
    conversation.summary.trim() !== "" &&
    conversation.summarizedAt !== undefined
  )
}

function summaryEntry(
  conversation: Doc<"conversations"> & {
    summarizedAt: number
    summary: string
  },
  message: Doc<"messages">,
  now: number
): RecencySummary {
  return {
    kind: "summary",
    ageMs: Math.max(0, now - conversation.summarizedAt),
    conversationId: conversation._id,
    identifiers: recencyIdentifiers(conversation, message),
    surface: message.surface,
    summary: conversation.summary,
  }
}

function referenceEntry(
  conversation: Doc<"conversations">,
  message: Doc<"messages">
): RecencyReference {
  return {
    kind: "reference",
    conversationId: conversation._id,
    identifiers: recencyIdentifiers(conversation, message),
    surface: message.surface,
  }
}

async function recentPersonMessages(
  ctx: QueryCtx,
  args: {
    now: number
    personId: Id<"persons">
    organizationId: string
  }
) {
  return await ctx.db
    .query("messages")
    .withIndex("by_organization_and_person_and_created_at", (query) =>
      query
        .eq("organizationId", args.organizationId)
        .eq("personId", args.personId)
        .gte("createdAt", args.now - recencyWindowMs)
    )
    .order("desc")
    .take(recencyMessageLimit)
}

function recencyIdentifiers(
  conversation: Doc<"conversations">,
  message: Doc<"messages">
) {
  return [
    `internal:conversation:${conversation._id}`,
    ...messageIdentifiers(message).filter(isConversationIdentifier),
  ]
}

function isConversationIdentifier(identifier: string) {
  return !messageLevelIdentifierPrefixes.some((prefix) =>
    identifier.startsWith(prefix)
  )
}

const messageLevelIdentifierPrefixes = [
  "internal:message:",
  "github:comment:",
  "linear:comment:",
  "linear:thread:",
  "slack:message:",
]

async function canIncludeConversation(
  conversation: Doc<"conversations">,
  run: RecencyRun,
  personal: boolean,
  sight: Sight
) {
  if (conversation.surface === "console") {
    return await sight.canSee(conversationGate(conversation))
  }
  return canIncludeRecentConversation({
    candidateAudience: conversation.scope,
    currentAudience: run.audience,
    personal,
  })
}

async function recentSight(
  ctx: QueryCtx,
  run: RecencyRun,
  organizationId: string,
  personal: boolean
) {
  const current =
    run.conversationId === undefined
      ? null
      : await ctx.db.get(run.conversationId)
  if (
    current?.surface === "console" &&
    current.organizationId === organizationId
  ) {
    return createConversationSight(ctx, current)
  }
  return createSight(ctx, {
    organizationId,
    personId: run.audience === "person" && personal ? run.personId : undefined,
  })
}
