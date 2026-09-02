import { type Validator, v } from "convex/values"
import { type Doc, type Id } from "../_generated/dataModel"
import { query } from "../_generated/server"
import { requireOrganizationAccess } from "../access"
import { readOrganizationTimezone } from "../organization/profile"
import { resolveCurrentPerson } from "../persons/account"
import { type QueryLikeCtx } from "../shared/context"
import {
  isWithin,
  rankContributors,
  type UsageWindow,
  type UsageWindowLength,
  usageSeries,
  usageTotals,
  usageWindowLengths,
  usageWindowOf,
} from "../usage/rollup"
import { createSight, type Sight } from "../visibility/sight"
import {
  type Grouping,
  nameContributors,
  readGroupings,
  readWindowRows,
  segmentFolders,
} from "./meter"
import { requireVisibleFolder } from "./tree"

// What a folder — or the whole organization — has cost. The folder surface
// reads the usage rollup, never the other way around: deleting a folder
// already moves its spend through folders/spend.ts, so folders depend on
// usage and one direction is the only arrangement that stays sound.
//
// Every member sees this. Spend is org-wide money, already itemized for
// every member in billing, so a folder's cost is not the thing to hide.
// Names are. A folder a member cannot see keeps its spend in the totals and
// stays out of the breakdown, and an automation a member cannot see does
// the same: its money still counts, but it is folded into one unnamed row
// rather than listed, and its own series is not hers to ask for.

/** The windows the query offers, built from the lengths the rollup knows
 *  how to make rather than restated beside them: a length added there is
 *  accepted here, and one removed there stops being accepted, with no
 *  second list to keep in step. */
const usageDays = v.union(
  ...usageWindowLengths.map((days) => v.literal(days))
) satisfies Validator<UsageWindowLength>

/** How deep the ranking goes. Each named row costs a document read to
 *  decide whether it is still there and whose it is, so the list is capped
 *  well below the row cap: deep enough to be the window's whole story in
 *  practice, shallow enough to bound the reads, the payload, and the
 *  filter's options at once. Overflow is simply not listed. */
const contributorLimit = 100

/**
 * One window of usage, already reduced to what the view draws: the window's
 * totals beside the previous window's, the ranked contributors, and the
 * scope divided one level down — root folders and the unfiled bucket across
 * the organization, subfolders and the folder's own rows inside one — both
 * as a ranking and as a zero-filled daily series stacked by that division.
 */
export const overview = query({
  args: {
    organizationId: v.string(),
    folderId: v.optional(v.id("folders")),
    days: usageDays,
  },
  handler: async (ctx, args) => {
    await requireOrganizationAccess(ctx, args.organizationId)

    const scope = {
      ...args,
      personId: await resolveCurrentPerson(ctx, args.organizationId),
    }

    if (args.folderId !== undefined) {
      await requireVisibleFolder(ctx, { ...scope, folderId: args.folderId })
    }

    return await readFolderUsage(ctx, { ...scope, now: Date.now() })
  },
})

/** The overview's whole body once the caller has been let in, taking the
 *  present as an argument so a test can stand anywhere in the calendar. */
export async function readFolderUsage(
  ctx: QueryLikeCtx,
  args: {
    organizationId: string
    personId: Id<"persons"> | undefined
    folderId?: Id<"folders">
    days: UsageWindowLength
    now: number
  }
) {
  const timezone = await readOrganizationTimezone(ctx, args.organizationId)
  const window = usageWindowOf(args.days, timezone, args.now)
  const sight = createSight(ctx, args)
  const groups = await readGroupings(ctx, sight, {
    ...args,
    parentId: args.folderId,
  })
  const rows = await readWindowRows(ctx, { ...args, groups, window })

  return {
    ...(await summarize(ctx, sight, {
      groups,
      rows,
      scope: args.folderId,
      window,
    })),
    timezone,
  }
}

async function summarize(
  ctx: QueryLikeCtx,
  sight: Sight,
  args: {
    groups: Grouping[]
    rows: Doc<"usage">[]
    scope: Id<"folders"> | undefined
    window: UsageWindow
  }
) {
  const { window } = args
  const current = args.rows.filter((row) =>
    isWithin(row.date, window.start, window.end)
  )
  const previous = args.rows.filter((row) =>
    isWithin(row.date, window.previousStart, window.previousEnd)
  )
  const ranked = rankContributors(current).slice(0, contributorLimit)
  const { segments, segmentOf } = segmentFolders(
    current,
    args.groups,
    args.scope
  )

  return {
    series: usageSeries(current, window, segmentOf),
    totals: usageTotals(current),
    previous: usageTotals(previous),
    automations: await nameContributors(ctx, sight, ranked),
    folders: segments,
  }
}
