import { type Doc, type Id } from "../_generated/dataModel"
import { canSeeAutomation } from "../automations/access"
import { type QueryLikeCtx } from "../shared/context"
import {
  sortContributors,
  type UsageContributor,
  type UsageWindow,
} from "../usage/rollup"
import { type Sight } from "../visibility/sight"
import { descendantFolderIds, treeCap } from "./tree"

// How a folder scope meters: which usage rows it reads, how those rows
// divide between the folders one level down, and which of the two it may
// name. Every question the Usage views ask is a date range over one of three
// indexes — the organization, a folder subtree, or a single automation — so
// picking the range is most of the work, and the viewer's sight decides the
// rest.

/** Ninety days of a heavily metered organization is thousands of rows, not
 *  tens of thousands. The cap keeps one slow read from becoming unbounded. */
const usageRowCap = 8000

export type Grouping = {
  folderId: Id<"folders">
  name: string
  /** The child's own id and every id below it: what its subtree total sums
   *  over, and what clicking the row drills into. */
  ids: Id<"folders">[]
  /** An invisible child still carries its subtree's spend into the totals;
   *  only its name and its row stay out. */
  visible: boolean
}

/** The folders one level below the scope, each with the subtree it stands
 *  for. Invisible children are kept so their spend still lands in the
 *  totals; the breakdown drops them when it lists names. */
export async function readGroupings(
  ctx: QueryLikeCtx,
  sight: Sight,
  args: {
    organizationId: string
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
export async function readWindowRows(
  ctx: QueryLikeCtx,
  args: {
    organizationId: string
    folderId?: Id<"folders">
    groups: Grouping[]
    window: UsageWindow
  }
) {
  const { window } = args

  if (args.folderId === undefined) {
    return await ctx.db
      .query("usage")
      .withIndex("by_organization_and_date", (index) =>
        index
          .eq("organizationId", args.organizationId)
          .gte("date", window.previousStart)
          .lte("date", window.end)
      )
      .take(usageRowCap)
  }

  return await readFolderRows(
    ctx,
    [args.folderId, ...args.groups.flatMap((group) => group.ids)],
    { from: window.previousStart, to: window.end }
  )
}

/** One folder's whole subtree across the shown window alone, which is all a
 *  filtered chart draws: it has no delta to measure. */
export async function readSubtreeRows(
  ctx: QueryLikeCtx,
  args: {
    organizationId: string
    folderId: Id<"folders">
    window: UsageWindow
  }
) {
  const ids = await descendantFolderIds(ctx, args.organizationId, args.folderId)

  return await readFolderRows(ctx, [args.folderId, ...ids], {
    from: args.window.start,
    to: args.window.end,
  })
}

/** One automation's rows. The automation index is keyed by the automation
 *  alone, so a row belonging to another organization would answer this
 *  range as readily as one of the caller's; the organization is checked on
 *  every row rather than assumed from the id. */
export async function readAutomationRows(
  ctx: QueryLikeCtx,
  args: {
    organizationId: string
    automationId: Id<"automations">
    window: UsageWindow
  }
) {
  const rows = await ctx.db
    .query("usage")
    .withIndex("by_automation_and_date", (index) =>
      index
        .eq("automation.id", args.automationId)
        .gte("date", args.window.start)
        .lte("date", args.window.end)
    )
    .take(usageRowCap)

  return rows.filter((row) => row.organizationId === args.organizationId)
}

type SubtreeTotals = { micros: number; ended: number; failed: number }

/** A subtree total per named child, biggest first, carrying the same
 *  figures a contributor does so the two rankings read alike. Children
 *  that cost nothing in the window stay out: the list exists to point
 *  somewhere. */
export function folderBreakdown(rows: Doc<"usage">[], groups: Grouping[]) {
  const totalsByFolder = new Map<Id<"folders">, SubtreeTotals>()

  for (const row of rows) {
    if (row.folderId !== undefined) {
      const carried = totalsByFolder.get(row.folderId) ?? {
        micros: 0,
        ended: 0,
        failed: 0,
      }

      totalsByFolder.set(row.folderId, {
        micros: carried.micros + row.micros,
        ended: carried.ended + row.runs.ended,
        failed: carried.failed + row.runs.failed,
      })
    }
  }

  return groups
    .filter((group) => group.visible)
    .map((group) => ({
      folderId: group.folderId,
      name: group.name,
      ...group.ids.reduce<SubtreeTotals>(
        (total, id) => {
          const carried = totalsByFolder.get(id)

          return carried === undefined
            ? total
            : {
                micros: total.micros + carried.micros,
                ended: total.ended + carried.ended,
                failed: total.failed + carried.failed,
              }
        },
        { micros: 0, ended: 0, failed: 0 }
      ),
    }))
    .filter((entry) => entry.micros > 0)
    .sort((left, right) =>
      right.micros === left.micros
        ? left.name.localeCompare(right.name)
        : right.micros - left.micros
    )
}

async function readFolderRows(
  ctx: QueryLikeCtx,
  folderIds: Id<"folders">[],
  range: { from: string; to: string }
) {
  const rows: Doc<"usage">[] = []

  for (const folderId of folderIds) {
    rows.push(
      ...(await ctx.db
        .query("usage")
        .withIndex("by_folder_and_date", (index) =>
          index
            .eq("folderId", folderId)
            .gte("date", range.from)
            .lte("date", range.to)
        )
        .take(usageRowCap))
    )
  }

  return rows
}

/** Work whose automation the viewer may not see, gathered under one
 *  caption. The automation's own name sits on every row it wrote, so a
 *  row's caption is no safer to show than the automation itself. */
const hiddenLabel = "Automations you cannot see"

/** A deleted automation keeps the caption its rows carry — its spend is
 *  history and there is nothing left to open — and loses its id, so the
 *  console neither links it nor offers it to the chart's filter. One the
 *  viewer merely may not see loses its caption too and folds into a single
 *  row, so the ranking still adds up without naming what it may not name. */
export async function nameContributors(
  ctx: QueryLikeCtx,
  sight: Sight,
  contributors: UsageContributor[]
): Promise<UsageContributor[]> {
  const named: UsageContributor[] = []
  const hidden: UsageContributor = {
    label: hiddenLabel,
    micros: 0,
    ended: 0,
    failed: 0,
  }

  for (const { id, ...contributor } of contributors) {
    const automation = id === undefined ? null : await ctx.db.get(id)

    if (automation !== null && !(await canSeeAutomation(sight, automation))) {
      hidden.micros += contributor.micros
      hidden.ended += contributor.ended
      hidden.failed += contributor.failed
    } else {
      named.push(automation === null ? contributor : { ...contributor, id })
    }
  }

  return hidden.micros === 0 && hidden.ended === 0
    ? named
    : sortContributors([...named, hidden])
}
