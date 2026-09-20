import { readMessageContext } from "../../contracts/replies/answers"
import { resourceToken } from "../../contracts/replies/parts"
import { type ReferenceTarget } from "../../contracts/replies/references"

import { type Doc } from "../_generated/dataModel"
import { type QueryLikeCtx } from "../shared/context"
import { type Sight } from "../visibility/sight"
import {
  type ResolvedContext,
  resolveConsoleContext,
  resolveConsoleReferences,
} from "./references"

/** One folder line and a line per inline reference, checked against the
 * current audience. No contents or folder inventory are injected. */
export async function messageContextLine(
  ctx: QueryLikeCtx,
  message: Doc<"messages">,
  sight: Sight
) {
  if (message.surface !== "console" || message.actor?.kind === "self") {
    return undefined
  }

  const context = readMessageContext(message.data)
  const lines = [
    ...(context === undefined
      ? ["Working outside any folder."]
      : [
          consoleContextLine(
            context,
            await resolveConsoleContext(ctx, sight, message.data)
          ),
        ]),
    ...(await resolveConsoleReferences(ctx, sight, message.data)).map(
      consoleReferenceLine
    ),
  ]

  return lines.join("\n")
}

/** One line for the model: what the message was sent about, with the id
 *  the way the jori tools take it, so the resource can be read without
 *  guessing. A context that no longer resolves says so, id and all. */
function consoleContextLine(
  context: ReferenceTarget,
  resolved: ResolvedContext | undefined
) {
  const id = referenceIdLabel(context)

  return resolved === undefined
    ? `Working in a ${context.kind} that is no longer available (${id})`
    : `Working in ${context.kind} «${resolved.name}» (${id})`
}

/** One line for the model per mention in the text: the token as it
 *  stands there, what it names, and the id the way the jori tools take
 *  it. A mention that no longer resolves says so, id and all. */
function consoleReferenceLine(
  reference: ReferenceTarget & { name: string | null }
) {
  const token = resourceToken(reference)
  const id = referenceIdLabel(reference)

  return reference.name === null
    ? `${token} mentions a ${reference.kind} that is no longer available (${id})`
    : `${token} mentions ${reference.kind} «${reference.name}» (${id})`
}

function referenceIdLabel(target: ReferenceTarget) {
  const noun = target.kind === "chat" ? "conversation" : target.kind

  return `${noun}Id: ${target.id}`
}
