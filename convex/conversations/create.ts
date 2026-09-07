import { type Infer } from "convex/values"
import { type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { type modelSelectionValidator } from "../model/selection"
import { insertRow } from "../shared/context"

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
    model?: Infer<typeof modelSelectionValidator>
    now: number
  }
) {
  const conversation = await insertRow(ctx, "conversations", {
    organizationId: args.organizationId,
    surface: "console",
    externalId: "",
    scope: "person",
    title: conversationTitle(args.text),
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
