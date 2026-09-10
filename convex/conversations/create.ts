import { type Infer } from "convex/values"
import { type MessageContext } from "../../contracts/replies/answers"
import { type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { resolveConsoleContext } from "../messages/references"
import { type modelSelectionValidator } from "../model/selection"
import { loadReference, referenceTable } from "../references/lookup"
import { insertRow, type QueryLikeCtx } from "../shared/context"
import { createSight, type Sight } from "../visibility/sight"

const titleMaxLength = 80

// The conversation's key is its own id, so console messages resolve their
// conversation through the same organization + integration + external index
// as provider messages; the id only exists once the row does.
export async function createConsoleConversation(
  ctx: MutationCtx,
  args: {
    organizationId: string
    personId: Id<"persons">
    text: string
    context?: MessageContext
    model?: Infer<typeof modelSelectionValidator>
    now: number
  }
) {
  const context = await resolveConsoleContext(
    ctx,
    createSight(ctx, {
      organizationId: args.organizationId,
      personId: args.personId,
    }),
    { context: args.context }
  )
  const conversation = await insertRow(ctx, "conversations", {
    organizationId: args.organizationId,
    surface: "console",
    externalId: "",
    scope: "person",
    visibility: { mode: "private" },
    title: conversationTitle(args.text),
    folderId: context?.folderId,
    createdBy: args.personId,
    updatedAt: args.now,
    ...(args.model === undefined ? {} : { model: args.model }),
  })

  await ctx.db.patch(conversation._id, { externalId: conversation._id })

  return { ...conversation, externalId: conversation._id }
}

function conversationTitle(text: string) {
  const line = text.split("\n").find((candidate) => candidate.trim() !== "")
  const title = (line ?? text).trim()

  return title.length > titleMaxLength
    ? `${title.slice(0, titleMaxLength - 3)}...`
    : title
}

/** The context's id in its kind's own table, or nothing for an id of
 *  another shape — the check `references.resolve` makes, made before the
 *  message is kept. */
export function normalizeConsoleContext(
  ctx: QueryLikeCtx,
  context: MessageContext
): MessageContext | null {
  const id = ctx.db.normalizeId(referenceTable(context.kind), context.id)

  return id === null ? null : { kind: context.kind, id }
}

/** The resources a message mentions, each in its kind's own table and
 *  visible to the sender, or an error naming the first that is not: the
 *  check the console's picker already made, made again before the message
 *  is kept, so a stored mention always pointed at something real. */
export async function normalizeConsoleReferences(
  ctx: QueryLikeCtx,
  sight: Sight,
  references: MessageContext[]
): Promise<Array<MessageContext & { name: string }>> {
  const seen = new Set<string>()
  const normalized: Array<MessageContext & { name: string }> = []

  for (const reference of references) {
    const target = normalizeConsoleContext(ctx, reference)
    const loaded =
      target === null ? null : await loadReference(ctx, sight, target)

    if (target === null || loaded === null) {
      throw new Error(`The mentioned ${reference.kind} is not available.`)
    }

    const key = `${target.kind}:${target.id}`

    if (!seen.has(key)) {
      seen.add(key)
      normalized.push({ ...target, name: loaded.name })
    }
  }

  return normalized
}
