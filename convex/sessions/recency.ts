import { type Doc, type Id } from "../_generated/dataModel"
import { loadRecentActivity } from "../conversations/recency/load"
import { renderPersonContext } from "../conversations/recency/render"
import { canonicalPersonId } from "../persons/data"
import { getActorDisplayName } from "../shared/actor"
import { type QueryLikeCtx } from "../shared/context"

type SessionRecency = NonNullable<Doc<"sessions">["recency"]>

export type RecencyEmission = {
  contexts: string[]
  recency: SessionRecency
}

type DuePerson = {
  name: string | null
  personId: Id<"persons">
  seeded: boolean
}

export function initialRecency(message: Doc<"messages">): SessionRecency {
  return {
    due: message.personId === undefined ? [] : [message.personId],
    done: [],
    seen: [],
  }
}

// Renders one person-context bundle per not-yet-contextualized speaker. The
// requester's bundle (seeded as due at session start) lands in the stored
// recency state so the prompt can serve it retry-stably; batch senders emit
// as drained contexts. Returns null when nobody new is due.
export async function emitRecencyContexts(
  ctx: QueryLikeCtx,
  session: Doc<"sessions">,
  batch: Doc<"messages">[]
): Promise<RecencyEmission | null> {
  const state = session.recency ?? { due: [], done: [], seen: [] }
  const due = await duePersons(ctx, state, batch)

  if (due.length === 0) {
    return null
  }

  const run =
    session.runId === undefined ? null : await ctx.db.get(session.runId)

  if (run === null) {
    return null
  }

  return await collectContexts(ctx, { due, run, session, state })
}

async function collectContexts(
  ctx: QueryLikeCtx,
  args: {
    due: DuePerson[]
    run: Doc<"runs">
    session: Doc<"sessions">
    state: SessionRecency
  }
): Promise<RecencyEmission> {
  const ownerId = await canonicalOwner(ctx, args.run)
  const contexts: string[] = []
  const done = [...args.state.done]
  const seen = [...args.state.seen]
  let requester = args.state.requester

  for (const person of args.due) {
    const entries = await loadRecentActivity(ctx, {
      now: Date.now(),
      personId: person.personId,
      run: {
        conversationId: args.session.conversationId,
        personId: ownerId,
        scope: args.run.scope,
      },
      seen,
      organizationId: args.run.organizationId,
    })

    done.push(person.personId)

    if (entries.length === 0) {
      continue
    }

    const rendered = renderPersonContext({
      entries,
      name: await personName(ctx, person, args.run),
    })

    if (person.seeded) {
      requester = rendered
    } else {
      contexts.push(rendered)
    }

    appendSeenSummaries(seen, entries)
  }

  return {
    contexts,
    recency: {
      due: [],
      done,
      seen,
      ...(requester === undefined ? {} : { requester }),
    },
  }
}

async function duePersons(
  ctx: QueryLikeCtx,
  state: SessionRecency,
  batch: Doc<"messages">[]
): Promise<DuePerson[]> {
  const done = new Set(state.done)
  const due: DuePerson[] = []

  for (const candidate of candidatePersons(state, batch)) {
    const personId = await canonicalPersonId(ctx, candidate.personId)

    if (done.has(personId)) {
      continue
    }

    done.add(personId)
    due.push({ name: candidate.name, personId, seeded: candidate.seeded })
  }

  return due
}

function candidatePersons(
  state: SessionRecency,
  batch: Doc<"messages">[]
): DuePerson[] {
  return [
    ...state.due.map((personId) => ({ name: null, personId, seeded: true })),
    ...batch.flatMap((message) =>
      message.personId === undefined
        ? []
        : [
            {
              name: getActorDisplayName(message.actor) ?? null,
              personId: message.personId,
              seeded: false,
            },
          ]
    ),
  ]
}

// Seeded due persons carry no name; they are by construction the sender of
// the message that caused the run.
async function personName(
  ctx: QueryLikeCtx,
  person: DuePerson,
  run: Doc<"runs">
) {
  if (person.name !== null) {
    return person.name
  }

  const message =
    run.cause.type === "message" ? await ctx.db.get(run.cause.messageId) : null

  return (
    (message === null ? undefined : getActorDisplayName(message.actor)) ??
    "unknown"
  )
}

async function canonicalOwner(ctx: QueryLikeCtx, run: Doc<"runs">) {
  return run.createdBy === undefined
    ? undefined
    : await canonicalPersonId(ctx, run.createdBy)
}

function appendSeenSummaries(
  seen: Id<"conversations">[],
  entries: Awaited<ReturnType<typeof loadRecentActivity>>
) {
  for (const entry of entries) {
    if (entry.kind === "summary") {
      seen.push(entry.conversationId)
    }
  }
}
