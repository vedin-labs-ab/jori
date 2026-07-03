import { type Doc, type Id } from "../_generated/dataModel"
import { type MutationCtx, type QueryCtx } from "../_generated/server"
import { loadRecentActivity } from "../conversations/recency/load"
import { renderPersonContext } from "../conversations/recency/render"
import { canonicalPersonId } from "../persons/data"
import { getActorDisplayName } from "../shared/actor"

type QueryLikeCtx = MutationCtx | QueryCtx
type SessionRecency = NonNullable<Doc<"sessions">["recency"]>

export type RecencyEmission = {
  contexts: string[]
  recency: SessionRecency
}

type DuePerson = {
  name: string | null
  personId: Id<"persons">
}

export function initialRecency(message: Doc<"messages">): SessionRecency {
  return {
    due: message.personId === undefined ? [] : [message.personId],
    done: [],
    seen: [],
  }
}

// Emits one person-context bundle per not-yet-contextualized speaker: the
// person who triggered the run (seeded as due at session start) plus every
// sender in the drained batch. Returns null when nobody new is due.
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
      tenantId: args.run.tenantId,
    })

    if (entries.length > 0) {
      const name = await personName(ctx, person, args.run)

      contexts.push(renderPersonContext({ entries, name }))
      appendSeenSummaries(seen, entries)
    }

    done.push(person.personId)
  }

  return { contexts, recency: { due: [], done, seen } }
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
    due.push({ name: candidate.name, personId })
  }

  return due
}

function candidatePersons(
  state: SessionRecency,
  batch: Doc<"messages">[]
): DuePerson[] {
  return [
    ...state.due.map((personId) => ({ name: null, personId })),
    ...batch.flatMap((message) =>
      message.personId === undefined
        ? []
        : [
            {
              name: getActorDisplayName(message.actor) ?? null,
              personId: message.personId,
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
