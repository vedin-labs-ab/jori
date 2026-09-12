import { v } from "convex/values"
import { internalMutation } from "./_generated/server"
import { seedContext } from "./seed/context"
import { seedDeduction } from "./seed/history/beliefs"
import { seedRuns } from "./seed/history/runs"
import { seedTraces } from "./seed/history/traces"
import { seedUsage } from "./seed/history/usage"
import { seedJobs } from "./seed/jobs"
import { files, seedFiles } from "./seed/library/files"
import { seedFolders } from "./seed/library/folders"
import { seedCollections } from "./seed/library/tables"
import { seedMessages } from "./seed/messages"
import { seedRoster } from "./seed/people"
import { seedPlaces } from "./seed/places"
import { seedProfile } from "./seed/profile"
import { seedSkills } from "./seed/skills"

// Development seeding, in four stages the script runs in order. Each stage is
// its own transaction and clears what it previously wrote, so a stage can be
// re-run alone and the whole seed can be run twice without doubling anything.
// Nothing here is reachable from the product: these are internal functions,
// and scripts/db/seed.ts refuses any deployment that is not a development one.

const organization = { organizationId: v.optional(v.string()) }

/** Who the organization is and who works there, plus the Slack channels and
 *  the traffic in them everything else is written against. */
export const foundation = internalMutation({
  args: organization,
  handler: async (ctx, args) => {
    const seed = await seedContext(ctx, args.organizationId)

    return {
      people: await seedRoster(ctx, seed),
      permissions: await seedProfile(ctx, seed),
      places: await seedPlaces(ctx, seed),
      messages: await seedMessages(ctx, seed),
    }
  },
})

/** The manifest the script uploads before the library stage can file it:
 *  each document's bytes, and the URL to put them at. */
export const uploads = internalMutation({
  args: {},
  handler: async (ctx) => {
    const targets = []

    for (const file of files) {
      targets.push({
        key: file.key,
        mimeType: file.mimeType,
        body: file.body,
        url: await ctx.storage.generateUploadUrl(),
      })
    }

    return targets
  },
})

/** Folders, the tables and stores filed in them, and the documents whose
 *  bytes the script has just put in storage. */
export const library = internalMutation({
  args: {
    ...organization,
    uploads: v.array(
      v.object({
        key: v.string(),
        storageId: v.id("_storage"),
        size: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const seed = await seedContext(ctx, args.organizationId)

    return {
      folders: await seedFolders(ctx, seed),
      collections: await seedCollections(ctx, seed),
      files: await seedFiles(ctx, seed, args.uploads),
    }
  },
})

/** The standing work: the organization's own skills, and the jobs that
 *  carry them. Jobs are written without a scheduled function, so the
 *  console shows a schedule and nothing fires. */
export const work = internalMutation({
  args: organization,
  handler: async (ctx, args) => {
    const seed = await seedContext(ctx, args.organizationId)

    return {
      skills: await seedSkills(ctx, seed),
      jobs: await seedJobs(ctx, seed),
    }
  },
})

/** Sixty days of runs, the traces of the recent ones, the usage rollup over
 *  all of them, and what Jori deduced the company was working on. */
export const history = internalMutation({
  args: organization,
  handler: async (ctx, args) => {
    const seed = await seedContext(ctx, args.organizationId)
    const runs = await seedRuns(ctx, seed)

    return {
      runs: runs.length,
      traces: await seedTraces(ctx, seed, runs),
      usage: await seedUsage(ctx, seed, runs),
      deduction: await seedDeduction(ctx, seed),
    }
  },
})
