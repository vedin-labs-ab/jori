import { type PaginationOptions, paginationOptsValidator } from "convex/server"
import { type Infer, v } from "convex/values"
import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx, mutation, query } from "../_generated/server"
import { checkOrganizationAccess, requireOrganizationAccess } from "../access"
import { readUserProfile, requireUserId } from "../access/users"
import {
  consoleContextValidator,
  insertConsoleMessage,
} from "../messages/console"
import {
  accountArgs,
  ensureAccountPerson,
  resolveCurrentPerson,
} from "../persons/account"
import { resolvePersonByIdentity } from "../persons/identity/links"
import { findSession } from "../sessions/data"
import { createPersonActor } from "../shared/actor"
import { type QueryLikeCtx } from "../shared/context"
import { startMessageRun } from "./data"
import {
  findVisibleConsoleConversation,
  requireVisibleConsoleConversation,
} from "./resolve"

type ConsoleSendArgs = {
  organizationId: string
  personId: Id<"persons">
  profile: { name?: string; email?: string }
  conversationId?: Id<"conversations">
  text: string
  context?: Infer<typeof consoleContextValidator>
}

const titleMaxLength = 80

/** A person's message to Jori from the console. The first message opens the
 *  conversation; every message is recorded, then handed to the same run
 *  start Slack mentions use, so a blocked budget keeps the message. */
export const send = mutation({
  args: {
    organizationId: v.string(),
    conversationId: v.optional(v.id("conversations")),
    text: v.string(),
    context: v.optional(consoleContextValidator),
  },
  handler: async (ctx, args) => {
    const identity = await requireOrganizationAccess(ctx, args.organizationId)
    const personId = await ensureAccountPerson(
      ctx,
      accountArgs(identity, args.organizationId)
    )

    return await sendConsoleMessage(ctx, {
      ...args,
      personId,
      profile: readUserProfile(identity),
    })
  },
})

/** The current person's console conversations, most recently active first. */
export const list = query({
  args: {
    organizationId: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const personId = await resolveCurrentPerson(ctx, args.organizationId)

    return await listConsoleConversations(ctx, { ...args, personId })
  },
})

/** The run currently attached to the conversation's session, if any. */
export const live = query({
  args: {
    organizationId: v.string(),
    conversationId: v.id("conversations"),
  },
  handler: async (ctx, args) => {
    const access = await checkOrganizationAccess(ctx, args.organizationId)

    if (!access.ok) {
      return { status: "unauthorized" as const, message: access.message }
    }

    const conversation = await findVisibleConsoleConversation(ctx, {
      ...args,
      personId: await resolvePersonByIdentity(ctx, {
        organizationId: args.organizationId,
        provider: "auth",
        externalId: requireUserId(access.identity),
      }),
    })

    if (conversation === null) {
      return { status: "not_found" as const }
    }

    return {
      status: "ready" as const,
      run: await readLiveRun(ctx, conversation),
    }
  },
})

export async function sendConsoleMessage(
  ctx: MutationCtx,
  args: ConsoleSendArgs
) {
  const text = args.text.trim()

  if (text === "") {
    throw new Error("Message text cannot be empty.")
  }

  const now = Date.now()
  const conversation =
    args.conversationId === undefined
      ? await createConsoleConversation(ctx, { ...args, text, now })
      : await requireVisibleConsoleConversation(ctx, {
          conversationId: args.conversationId,
          organizationId: args.organizationId,
          personId: args.personId,
        })
  const message = await insertConsoleMessage(ctx, {
    actor: createPersonActor(args.personId, args.profile),
    conversation,
    data: args.context === undefined ? undefined : { context: args.context },
    mentioned: true,
    now,
    text,
  })
  const run = await startMessageRun(ctx, {
    conversation,
    integration: null,
    message,
    createdBy: args.personId,
    externalId: conversation.externalId,
    now,
  })

  return {
    conversationId: conversation._id,
    messageId: message._id,
    status: run.status,
  }
}

export async function listConsoleConversations(
  ctx: QueryLikeCtx,
  args: {
    organizationId: string
    paginationOpts: PaginationOptions
    personId: Id<"persons">
  }
) {
  const result = await ctx.db
    .query("conversations")
    .withIndex("by_organization_and_created_by_and_updated_at", (query) =>
      query
        .eq("organizationId", args.organizationId)
        .eq("createdBy", args.personId)
    )
    .order("desc")
    .paginate(args.paginationOpts)

  return { ...result, page: result.page.map(conversationView) }
}

export async function readLiveRun(
  ctx: QueryLikeCtx,
  conversation: Doc<"conversations">
) {
  const session = await findSession(ctx, conversation._id)
  const run =
    session?.runId === undefined ? null : await ctx.db.get(session.runId)

  return run === null ? null : { id: run._id, status: run.status }
}

// The conversation's key is its own id, so console messages resolve their
// conversation through the same organization + integration + external index
// as provider messages; the id only exists once the row does.
async function createConsoleConversation(
  ctx: MutationCtx,
  args: {
    organizationId: string
    personId: Id<"persons">
    text: string
    now: number
  }
) {
  const conversationId = await ctx.db.insert("conversations", {
    organizationId: args.organizationId,
    surface: "console",
    externalId: "",
    scope: "person",
    title: conversationTitle(args.text),
    createdBy: args.personId,
    updatedAt: args.now,
  })

  await ctx.db.patch(conversationId, { externalId: conversationId })

  const conversation = await ctx.db.get(conversationId)

  if (conversation === null) {
    throw new Error("Conversation insert failed.")
  }

  return conversation
}

function conversationTitle(text: string) {
  const line = text.split("\n").find((candidate) => candidate.trim() !== "")
  const title = (line ?? text).trim()

  return title.length > titleMaxLength
    ? `${title.slice(0, titleMaxLength - 3)}...`
    : title
}

function conversationView(conversation: Doc<"conversations">) {
  return {
    id: conversation._id,
    title: conversation.title ?? "",
    updatedAt: conversation.updatedAt ?? conversation._creationTime,
  }
}
