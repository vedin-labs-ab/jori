import { type Doc, type Id } from "../_generated/dataModel"
import { personDisplay } from "../persons/names"
import { type QueryLikeCtx } from "../shared/context"

export async function consoleAuthor(
  ctx: QueryLikeCtx,
  personId: Id<"persons">,
  viewerId: Id<"persons"> | undefined,
  fallback = "Member"
) {
  const display = await personDisplay(ctx, personId)
  return {
    id: personId,
    name: display.name ?? fallback,
    image: display.image,
    isViewer: personId === viewerId,
  }
}

/** One identity read per author per page; Jori replies carry no human author. */
export async function consoleMessageViews(
  ctx: QueryLikeCtx,
  messages: Doc<"messages">[],
  viewerId: Id<"persons"> | undefined
) {
  const authors = new Map<
    Id<"persons">,
    Awaited<ReturnType<typeof consoleAuthor>>
  >()
  for (const message of messages) {
    if (message.personId !== undefined && !authors.has(message.personId)) {
      authors.set(
        message.personId,
        await consoleAuthor(
          ctx,
          message.personId,
          viewerId,
          message.actor !== undefined && "name" in message.actor
            ? message.actor.name
            : undefined
        )
      )
    }
  }

  return messages.map((message) => ({
    id: message._id,
    role:
      message.actor?.kind === "self" ? ("jori" as const) : ("person" as const),
    ...(message.personId === undefined
      ? {}
      : { author: authors.get(message.personId) }),
    text: message.text ?? "",
    data: message.data,
    createdAt: message.createdAt,
  }))
}
