import { type Doc, type Id } from "../_generated/dataModel"
import { canSeeAutomation } from "../automations/access"
import { type QueryLikeCtx } from "../shared/context"
import {
  addFigures,
  sortContributors,
  type UsageContributor,
  type UsageFigures,
  type UsageWindow,
} from "../usage/rollup"
import { type Sight } from "../visibility/sight"
import { descendantFolderIds, treeCap } from "./tree"

// How a folder scope meters: which usage rows it reads, how those rows
// divide between the folders one level down, and which of them it may name.
// Every question the Usage views ask is a date range over the organization
// or a folder subtree, so picking the range is most of the work, and the
// viewer's sight decides the rest.

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

/** Work filed at the scope itself rather than in anything below it: the
 *  unfiled bucket across the organization, a folder's own rows inside one. */
export const directSegment = "direct"

/** Everything the chart cannot name: children past the palette, and
 *  children the viewer may not see, whose spend still has to land. */
export const otherSegment = "other"

/** How many segments the console can tell apart: its chart palette has
 *  this many colours, and a ninth would wear one of the first eight. */
const segmentLimit = 8

export type UsageSegment = UsageFigures & {
  key: string
  label: string
  /** Only a folder that still exists and may be named is a way further
   *  in; the direct and other segments lead nowhere. */
  folderId?: Id<"folders">
}

type Segmentation = {
  segments: UsageSegment[]
  segmentOf: (row: Doc<"usage">) => string
}

/**
 * The scope's rows divided one level down, biggest first: each named
 * child's whole subtree, the scope's own rows, and one unnamed rest. The
 * same division serves the folder table and the charts' stacks, so a
 * row's colour means the same thing in both. Segments that cost nothing
 * stay out: the list exists to point somewhere.
 */
export function segmentFolders(
  rows: Doc<"usage">[],
  groups: Grouping[],
  scope: Id<"folders"> | undefined
): Segmentation {
  const groupOf = new Map<Id<"folders">, Grouping>()

  for (const group of groups) {
    for (const id of group.ids) {
      groupOf.set(id, group)
    }
  }

  const keyOf = (row: Doc<"usage">) => {
    if (row.folderId === undefined || row.folderId === scope) {
      return directSegment
    }

    const group = groupOf.get(row.folderId)

    return group === undefined || !group.visible ? otherSegment : group.folderId
  }
  const figures = new Map<string, UsageSegment>()
  const other = blankSegment(otherSegment, "Other")

  for (const row of rows) {
    const key = keyOf(row)

    if (key === otherSegment) {
      addFigures(other, row)
    } else {
      figures.set(
        key,
        addFigures(figures.get(key) ?? openSegment(key, groupOf, scope), row)
      )
    }
  }

  const ranked = [...figures.values()]
    .filter((segment) => segment.micros > 0)
    .sort(bySpend)
  const named = ranked.slice(0, segmentLimit)
  const namedKeys = new Set(named.map((segment) => segment.key))

  for (const segment of ranked.slice(segmentLimit)) {
    other.micros += segment.micros
    other.ended += segment.ended
    other.failed += segment.failed
  }

  return {
    segments: other.micros > 0 ? [...named, other] : named,
    segmentOf: (row) => {
      const key = keyOf(row)

      return namedKeys.has(key) ? key : otherSegment
    },
  }
}

/** A segment the first time a row lands in it: the scope's own bucket,
 *  named for what it holds, or a child's, which is a way further in. */
function openSegment(
  key: string,
  groupOf: Map<Id<"folders">, Grouping>,
  scope: Id<"folders"> | undefined
): UsageSegment {
  if (key === directSegment) {
    return blankSegment(key, scope === undefined ? "Unfiled" : "Filed here")
  }

  const group = groupOf.get(key as Id<"folders">)

  return {
    ...blankSegment(key, group?.name ?? "Other"),
    folderId: key as Id<"folders">,
  }
}

function blankSegment(key: string, label: string): UsageSegment {
  return { key, label, micros: 0, ended: 0, failed: 0 }
}

function bySpend(left: UsageSegment, right: UsageSegment) {
  return right.micros === left.micros
    ? left.label.localeCompare(right.label)
    : right.micros - left.micros
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
