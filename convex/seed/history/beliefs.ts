import { defaultSelection } from "../../../contracts/models/selection"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { promptVersions } from "../../deduction/limits"
import {
  clearOrganization,
  daysAgo,
  hourMs,
  type SeedContext,
} from "../context"
import { resolvePeople } from "../people"
import { resolvePlaces } from "../places"
import { type SeedEffort, workstreams } from "./workstreams"

// What Jori has deduced the company is working on, written as the pipeline
// would leave it: beliefs over efforts over cited evidence, with a dated
// journal per effort. The passes that produced it are written too, and their
// windows end at the seed instant — which is what keeps the hourly sweep
// from re-reviewing seeded history the moment the deployment wakes up.

export async function seedDeduction(ctx: MutationCtx, seed: SeedContext) {
  const people = await resolvePeople(ctx, seed)
  const conversations = await resolveConversations(ctx, seed)

  await clearOrganization(
    ctx,
    ["beliefs", "efforts", "evidence", "journal", "passes"],
    seed.organizationId
  )

  const passId = await writePasses(ctx, seed)
  let efforts = 0

  for (const workstream of workstreams) {
    const beliefId = await ctx.db.insert("beliefs", {
      organizationId: seed.organizationId,
      kind: "workstream",
      name: workstream.name,
      brief: workstream.brief,
      aliases: workstream.aliases,
      status: workstream.status,
      seenAt: daysAgo(seed, workstream.seen, 16),
      anchors: workstream.efforts.flatMap((effort) => effort.anchors),
      sources: [
        ...new Set(workstream.efforts.flatMap((effort) => effort.sources)),
      ],
      createdAt: daysAgo(seed, workstream.seen + 20, 9),
      updatedAt: daysAgo(seed, workstream.seen, 16),
    })

    for (const effort of workstream.efforts) {
      await writeEffort(ctx, seed, effort, {
        beliefId,
        passId,
        people,
        conversations,
      })
      efforts += 1
    }
  }

  return { beliefs: workstreams.length, efforts }
}

async function writeEffort(
  ctx: MutationCtx,
  seed: SeedContext,
  effort: SeedEffort,
  refs: {
    beliefId: Id<"beliefs">
    passId: Id<"passes">
    people: Map<string, Id<"persons">>
    conversations: Map<string, Doc<"conversations">>
  }
) {
  const seenAt = daysAgo(seed, effort.seen, 16)
  const effortId = await ctx.db.insert("efforts", {
    organizationId: seed.organizationId,
    name: effort.name,
    summary: effort.summary,
    workstreamId: refs.beliefId,
    seenAt,
    anchors: effort.anchors,
    personIds: effort.people.flatMap((handle) => {
      const personId = refs.people.get(`${handle}@vedinlabs.example`)

      return personId === undefined ? [] : [personId]
    }),
    sources: effort.sources,
    createdAt: daysAgo(seed, effort.seen + 8, 9),
    updatedAt: seenAt,
  })

  await writeCitations(ctx, seed, effort, { ...refs, effortId, seenAt })

  for (const [days, entry] of effort.journal) {
    await ctx.db.insert("journal", {
      organizationId: seed.organizationId,
      effortId,
      passId: refs.passId,
      entry,
      observedAt: daysAgo(seed, days, 17),
      createdAt: daysAgo(seed, days, 17, 30),
      workstreamId: refs.beliefId,
    })
  }
}

/** Each layer cites the layer below: the effort cites the conversation it was
 *  read out of, and the belief cites the effort. */
async function writeCitations(
  ctx: MutationCtx,
  seed: SeedContext,
  effort: SeedEffort,
  refs: {
    beliefId: Id<"beliefs">
    effortId: Id<"efforts">
    passId: Id<"passes">
    seenAt: number
    conversations: Map<string, Doc<"conversations">>
  }
) {
  const conversation = refs.conversations.get(effort.channel)

  if (conversation !== undefined) {
    await ctx.db.insert("evidence", {
      organizationId: seed.organizationId,
      subject: { kind: "effort", effortId: refs.effortId },
      passId: refs.passId,
      reference: {
        kind: "conversation",
        conversationId: conversation._id,
        summarizedAt: conversation.summarizedAt ?? refs.seenAt,
      },
      why: effort.why,
      observedAt: refs.seenAt,
      integration: "slack",
      workstreamId: refs.beliefId,
    })
  }

  await ctx.db.insert("evidence", {
    organizationId: seed.organizationId,
    subject: { kind: "belief", beliefId: refs.beliefId },
    passId: refs.passId,
    reference: { kind: "effort", effortId: refs.effortId },
    why: `${effort.name}: ${effort.summary}`,
    observedAt: refs.seenAt,
  })
}

/** A completed pass per stage and scope, each covering everything up to the
 *  seed instant. Cadence is measured from the last reviewed window's end, so
 *  a seeded deployment is already caught up and reviews nothing until real
 *  activity arrives. */
async function writePasses(ctx: MutationCtx, seed: SeedContext) {
  const stages = [
    { stage: "effort", scope: "window", prompt: promptVersions.effort },
    { stage: "workstream", scope: "window", prompt: promptVersions.workstream },
    {
      stage: "workstream",
      scope: "full",
      prompt: promptVersions.consolidation,
    },
  ] as const
  let latest: Id<"passes"> | undefined

  for (const entry of stages) {
    latest = await ctx.db.insert("passes", {
      organizationId: seed.organizationId,
      stage: entry.stage,
      scope: entry.scope,
      status: "completed",
      window: { start: seed.now - 7 * 24 * hourMs, end: seed.now },
      prompt: { version: entry.prompt, model: defaultSelection.model },
      startedAt: seed.now - 2 * hourMs,
      endedAt: seed.now - 2 * hourMs + 90_000,
    })
  }

  if (latest === undefined) {
    throw new Error("Seeding deduction needs at least one pass.")
  }

  return latest
}

async function resolveConversations(ctx: MutationCtx, seed: SeedContext) {
  const places = await resolvePlaces(ctx, seed)
  const conversations = await ctx.db
    .query("conversations")
    .filter((row) => row.eq(row.field("organizationId"), seed.organizationId))
    .collect()
  const byExternalId = new Map(
    conversations.map((row) => [row.externalId, row])
  )

  return new Map(
    [...places].flatMap(([name, place]) => {
      const conversation = byExternalId.get(place.externalId)

      return conversation === undefined ? [] : [[name, conversation] as const]
    })
  )
}
