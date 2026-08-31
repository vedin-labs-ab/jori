import { v } from "convex/values"
import { type Doc, type Id } from "../_generated/dataModel"
import { query } from "../_generated/server"
import { requireOrganizationAccess } from "../access"
import { readOrganizationTimezone } from "../organization/profile"
import { resolveCurrentPerson } from "../persons/account"
import { type QueryLikeCtx } from "../shared/context"
import {
  isWithin,
  rankContributors,
  type UsageContributor,
  type UsageWindow,
  type UsageWindowLength,
  usageSeries,
  usageTotals,
  usageWindowOf,
} from "../usage/rollup"
import { createSight } from "../visibility/sight"
import { descendantFolderIds, requireVisibleFolder, treeCap } from "./tree"

// What a folder — or the whole organization — has cost. The folder surface
// reads the usage rollup, never the other way around: deleting a folder
// already moves its spend through folders/spend.ts, so folders depend on
// usage and one direction is the only arrangement that stays sound.
//
// Every member sees this. Spend is org-wide money, already itemized for
// every member in billing, so a folder's cost is not the thing to hide;
// the names of folders a member cannot see still are.

/** Ninety days of a heavily metered organization is thousands of rows, not
 *  tens of thousands. The cap keeps one slow read from becoming unbounded. */
const usageRowCap = 8000

/** How many contributors the ranking names before the rest fold into a
 *  single remainder row. */
const contributorLimit = 8

type Grouping = {
  folderId: Id<"folders">
  name: string
  /** The child's own id and every id below it: what its subtree total sums
   *  over, and what clicking the row drills into. */
  ids: Id<"folders">[]
  /** An invisible child still carries its subtree's spend into the totals;
   *  only its name and its row stay out. */
  visible: boolean
}

/**
 * One window of usage, already reduced to what the view draws: a zero-filled
 * daily series, the window's totals against the previous window's, the top
 * contributors, and the subtree totals of whatever sits one level down —
 * direct subfolders inside a folder, root folders and the unfiled bucket
 * across the organization.
 */
export const overview = query({
  args: {
    organizationId: v.string(),
    folderId: v.optional(v.id("folders")),
    days: v.union(v.literal(7), v.literal(30), v.literal(90)),
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

/** The query's whole body once the caller has been let in, taking the
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
  const groups = await readGroupings(ctx, { ...args, parentId: args.folderId })
  const rows = await readRows(ctx, { ...args, groups, window })

  return {
    ...(await summarize(ctx, {
      groups,
      rows,
      scoped: args.folderId !== undefined,
      window,
    })),
    timezone,
  }
}

/** The folders one level below the scope, each with the subtree it stands
 *  for. Invisible children are kept so their spend still lands in the
 *  totals; the breakdown drops them when it lists names. */
async function readGroupings(
  ctx: QueryLikeCtx,
  args: {
    organizationId: string
    personId: Id<"persons"> | undefined
    parentId: Id<"folders"> | undefined
  }
): Promise<Grouping[]> {
  const children = await ctx.db
    .query("folders")
    .withIndex("by_organization_and_parent", (index) =>
      index
        .eq("organizationId", args.organizationId)
        .eq("parentId", args.parentId)
    )
    .take(treeCap)
  const sight = createSight(ctx, args)
  const groups: Grouping[] = []

  for (const child of children) {
    groups.push({
      folderId: child._id,
      name: child.name,
      ids: [
        child._id,
        ...(await descendantFolderIds(ctx, args.organizationId, child._id)),
      ],
      visible: await sight.canSeeFolder(child),
    })
  }

  return groups
}

/** Both windows in one read, so the delta costs nothing extra. Folder
 *  totals are leaf rows summed over the subtree, so a folder scope reads
 *  the folder's own rows plus every descendant's; the organization scope
 *  is a single range that already includes the unfiled bucket. */
async function readRows(
  ctx: QueryLikeCtx,
  args: {
    organizationId: string
    folderId?: Id<"folders">
    groups: Grouping[]
    window: UsageWindow
  }
) {
  if (args.folderId === undefined) {
    return await ctx.db
      .query("usage")
      .withIndex("by_organization_and_date", (index) =>
        index
          .eq("organizationId", args.organizationId)
          .gte("date", args.window.previousStart)
          .lte("date", args.window.end)
      )
      .take(usageRowCap)
  }

  const rows: Doc<"usage">[] = []

  for (const folderId of [
    args.folderId,
    ...args.groups.flatMap((group) => group.ids),
  ]) {
    rows.push(...(await readFolderRows(ctx, folderId, args.window)))
  }

  return rows
}

function readFolderRows(
  ctx: QueryLikeCtx,
  folderId: Id<"folders">,
  window: UsageWindow
) {
  return ctx.db
    .query("usage")
    .withIndex("by_folder_and_date", (index) =>
      index
        .eq("folderId", folderId)
        .gte("date", window.previousStart)
        .lte("date", window.end)
    )
    .take(usageRowCap)
}

async function summarize(
  ctx: QueryLikeCtx,
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
  const ranking = rankContributors(current, contributorLimit)

  return {
    series: usageSeries(current, window),
    totals: usageTotals(current),
    previous: { micros: usageTotals(previous).micros },
    automations: await withLiveAutomations(ctx, ranking.automations),
    rest: ranking.rest,
    folders: folderBreakdown(current, args.groups),
    // Interactive work and work whose folder is gone, which only the
    // organization-wide view has a place for.
    unfiled: args.scoped
      ? null
      : usageTotals(current.filter((row) => row.folderId === undefined)),
  }
}

/** A subtree total per named child, biggest first. Children that cost
 *  nothing in the window stay out: the list exists to point somewhere. */
function folderBreakdown(rows: Doc<"usage">[], groups: Grouping[]) {
  const microsByFolder = new Map<Id<"folders">, number>()

  for (const row of rows) {
    if (row.folderId !== undefined) {
      const carried = microsByFolder.get(row.folderId) ?? 0

      microsByFolder.set(row.folderId, carried + row.micros)
    }
  }

  return groups
    .filter((group) => group.visible)
    .map((group) => ({
      folderId: group.folderId,
      name: group.name,
      micros: group.ids.reduce(
        (total, id) => total + (microsByFolder.get(id) ?? 0),
        0
      ),
    }))
    .filter((entry) => entry.micros > 0)
    .sort((left, right) =>
      right.micros === left.micros
        ? left.name.localeCompare(right.name)
        : right.micros - left.micros
    )
}

/** A deleted automation keeps its caption — the row carries its own — but
 *  loses its id, so the console links only what is still there to open. */
async function withLiveAutomations(
  ctx: QueryLikeCtx,
  contributors: UsageContributor[]
): Promise<UsageContributor[]> {
  return await Promise.all(
    contributors.map(async ({ id, ...contributor }) =>
      id !== undefined && (await ctx.db.get(id)) !== null
        ? { ...contributor, id }
        : contributor
    )
  )
}
