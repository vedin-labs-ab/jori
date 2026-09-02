import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { type RunSnapshot } from "../../runs/schema"
import { clearOrganization, type SeedContext } from "../context"
import { resolveFolders } from "../library/folders"
import { resolvePeople } from "../people"
import { resolvePlaces } from "../places"
import { seedEvents } from "./events"
import { eventKey, type WorkItem, workItems } from "./work"

// One run per piece of work, written the way the runtime would have left it
// behind: a job run carries the job it answers to and the
// folder its cost is filed under, interactive work carries neither. Nothing
// here is queued or running, so no worker can pick a seeded run up.

type RunRefs = {
  jobs: Map<string, Doc<"jobs">>
  conversations: Map<string, Id<"conversations">>
  events: Map<string, Id<"events">>
  folders: Map<string, Id<"folders">>
  mentions: Map<string, Id<"messages">>
  people: Map<string, Id<"persons">>
}

/** A written run beside the work item it came from, so the stages that read
 *  a run's cost and its steps do not have to re-derive either. */
export type SeededRun = { run: Doc<"runs">; item: WorkItem }

export async function seedRuns(ctx: MutationCtx, seed: SeedContext) {
  const items = workItems(seed)

  await clearOrganization(ctx, ["runs", "traces"], seed.organizationId)

  const events = await seedEvents(ctx, seed, items)
  const refs = await resolveRefs(ctx, seed, events)

  const seeded: SeededRun[] = []

  for (const item of items) {
    const runId = await ctx.db.insert("runs", buildRun(seed, item, refs))
    const run = await ctx.db.get(runId)

    if (run !== null) {
      seeded.push({ run, item })
    }
  }

  return seeded
}

function buildRun(seed: SeedContext, item: WorkItem, refs: RunRefs) {
  const job = refs.jobs.get(item.job ?? "")
  const personId = refs.people.get(item.person ?? "")
  const conversationId = refs.conversations.get(item.channel ?? "")

  return {
    organizationId: seed.organizationId,
    job: job === undefined ? undefined : { id: job._id, version: job.version },
    audience:
      item.trigger === "message"
        ? ("conversation" as const)
        : ("organization" as const),
    conversationId,
    cause: buildCause(item, refs, personId),
    principal:
      personId === undefined || item.trigger !== "manual"
        ? ({ kind: "organization" } as const)
        : ({ kind: "person", personId } as const),
    instructions: job?.instructions,
    access: job?.access,
    snapshot: buildSnapshot(item),
    status: item.status,
    error: item.error,
    result: item.result,
    createdBy: personId,
    folderId:
      item.folder === undefined ? undefined : refs.folders.get(item.folder),
    createdAt: item.at,
    endedAt: item.at + item.durationMs,
  }
}

/** Every run says truthfully what set it going: the clock, the webhook that
 *  arrived, or the person who asked. */
function buildCause(
  item: WorkItem,
  refs: RunRefs,
  personId: Id<"persons"> | undefined
) {
  if (item.trigger === "schedule") {
    return { type: "time" as const, scheduledAt: item.at }
  }

  const messageId = refs.mentions.get(item.mention ?? "")

  if (messageId !== undefined) {
    return { type: "message" as const, messageId, kind: "mention" as const }
  }

  const eventId = refs.events.get(eventKey(item))

  if (eventId !== undefined) {
    return { type: "event" as const, eventId }
  }

  return { type: "manual" as const, personId }
}

/** What the console shows before it opens a run: the title, where the work
 *  came in from, and the few facts that place it. */
function buildSnapshot(item: WorkItem): RunSnapshot {
  return {
    title: item.title,
    source: {
      type: item.trigger === "schedule" ? "job" : item.trigger,
      surface: item.surface,
    },
    context: [
      ...(item.channel === undefined
        ? []
        : [{ type: "channel" as const, label: `#${item.channel}` }]),
      ...(item.job === undefined
        ? []
        : [{ type: "schedule" as const, label: item.job }]),
    ],
  }
}

async function resolveRefs(
  ctx: MutationCtx,
  seed: SeedContext,
  events: Map<string, Id<"events">>
): Promise<RunRefs> {
  const jobs = await ctx.db
    .query("jobs")
    .withIndex("by_organization", (index) =>
      index.eq("organizationId", seed.organizationId)
    )
    .collect()
  const conversations = await ctx.db
    .query("conversations")
    .filter((row) => row.eq(row.field("organizationId"), seed.organizationId))
    .collect()
  const places = await resolvePlaces(ctx, seed)
  const byExternalId = new Map(
    conversations.map((row) => [row.externalId, row._id])
  )

  return {
    jobs: new Map(jobs.map((row) => [row.name, row])),
    conversations: new Map(
      [...places].flatMap(([name, place]) => {
        const conversationId = byExternalId.get(place.externalId)

        return conversationId === undefined ? [] : [[name, conversationId]]
      })
    ),
    events,
    folders: await resolveFolders(ctx, seed),
    mentions: await resolveMentions(ctx, seed),
    people: await resolvePeople(ctx, seed),
  }
}

/** Runs a message caused point at that message, so the console can show what
 *  was said. Only the lines that addressed Jori can be one. */
async function resolveMentions(ctx: MutationCtx, seed: SeedContext) {
  const messages = await ctx.db
    .query("messages")
    .filter((row) => row.eq(row.field("organizationId"), seed.organizationId))
    .collect()

  return new Map(
    messages
      .filter((message) => message.mentioned && message.text !== undefined)
      .map((message) => [message.text ?? "", message._id])
  )
}
