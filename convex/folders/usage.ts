import { type Validator, v } from "convex/values"
import { type Doc, type Id } from "../_generated/dataModel"
import { query } from "../_generated/server"
import { requireOrganizationAccess } from "../access"
import { requireVisibleAutomation } from "../automations/access"
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
  folderBreakdown,
  type Grouping,
  nameContributors,
  readAutomationRows,
  readGroupings,
  readSubtreeRows,
  readWindowRows,
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

/** The windows both queries offer, built from the lengths the rollup knows
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
 * One window of usage, already reduced to what the view draws: a zero-filled
 * daily series, the window's totals beside the previous window's, the
 * ranked contributors, and the subtree totals of whatever sits one level
 * down — direct subfolders inside a folder, root folders and the unfiled
 * bucket across the organization.
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

/**
 * One slice of the same window, for the spend chart's filter: a subtree's
 * days, one automation's, or one automation's within a subtree. Only the
 * series comes back — the figures above the chart stay about the whole
 * scope.
 */
export const series = query({
  args: {
    organizationId: v.string(),
    folderId: v.optional(v.id("folders")),
    automationId: v.optional(v.id("automations")),
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

    if (args.automationId !== undefined) {
      await requireVisibleAutomation(ctx, {
        ...scope,
        automationId: args.automationId,
      })
    }

    return await readUsageSlice(ctx, { ...args, now: Date.now() })
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
      scoped: args.folderId !== undefined,
      window,
    })),
    timezone,
  }
}

/** The slice query's body. A folder narrows to its subtree and an
 *  automation to its own rows; naming both narrows to the intersection,
 *  which is what a folder page's filter means when it offers an automation
 *  that only spends part of its money here. */
export async function readUsageSlice(
  ctx: QueryLikeCtx,
  args: {
    organizationId: string
    folderId?: Id<"folders">
    automationId?: Id<"automations">
    days: UsageWindowLength
    now: number
  }
) {
  const timezone = await readOrganizationTimezone(ctx, args.organizationId)
  const window = usageWindowOf(args.days, timezone, args.now)

  return {
    series: usageSeries(await readSliceRows(ctx, { ...args, window }), window),
  }
}

async function readSliceRows(
  ctx: QueryLikeCtx,
  args: {
    organizationId: string
    folderId?: Id<"folders">
    automationId?: Id<"automations">
    window: UsageWindow
  }
): Promise<Doc<"usage">[]> {
  const { automationId, folderId } = args

  if (folderId !== undefined) {
    const rows = await readSubtreeRows(ctx, { ...args, folderId })

    return automationId === undefined
      ? rows
      : rows.filter((row) => row.automation?.id === automationId)
  }

  if (automationId === undefined) {
    // A slice of nothing would come back as a plausible line of zeroes, and
    // a public entrypoint should refuse rather than answer wrongly.
    throw new Error("Name an automation or a folder to chart.")
  }

  return await readAutomationRows(ctx, { ...args, automationId })
}

async function summarize(
  ctx: QueryLikeCtx,
  sight: Sight,
  args: {
    groups: Grouping[]
    rows: Doc<"usage">[]
    scoped: boolean
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

  return {
    series: usageSeries(current, window),
    totals: usageTotals(current),
    previous: usageTotals(previous),
    automations: await nameContributors(ctx, sight, ranked),
    folders: folderBreakdown(current, args.groups),
    // Interactive work and work whose folder is gone, which only the
    // organization-wide view has a place for.
    unfiled: args.scoped
      ? null
      : usageTotals(current.filter((row) => row.folderId === undefined)),
  }
}
