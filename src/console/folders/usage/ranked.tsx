import { formatUsd } from "@contracts/billing"
import { Link } from "@tanstack/react-router"
import { type ReactNode, useState } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableFrame,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { SegmentSwatch } from "./legend"
import {
  type UsageContributor,
  type UsageDays,
  type UsageSegment,
  usageCostPerRun,
  usagePercent,
  usageSegmentColor,
  usageShare,
} from "./types"

// The two tables the page ends on: what spent the window's money, and where
// it sits. Both carry the same columns — runs, failures, spend, cost per
// run, and the row's share of the window as a figure and a bar against the
// leader — so the eye reads them the same way, and both open the same way
// when there is more than a glance's worth.

/** A ranking is read from the top, so the top is what a table opens with.
 *  Five leaves the two tables a comparable height beside each other. */
const rankedCutoff = 5

const nameLinkClassName =
  "underline-offset-2 hover:underline focus-visible:underline"

const figureClassName = "text-right tabular-nums"

type RankedEntry = { ended: number; failed: number; micros: number }

/** The leaders, and the rest on request. Both tables hand their rows in
 *  already built, so the cutoff is decided in one place for both. */
function RankedTable({ noun, rows }: { noun: string; rows: ReactNode[] }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <TableFrame>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>{noun}</TableHead>
            <FigureHead>Runs</FigureHead>
            <FigureHead>Failed</FigureHead>
            <FigureHead>Spend</FigureHead>
            <FigureHead>Cost / run</FigureHead>
            <FigureHead>Share</FigureHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expanded ? rows : rows.slice(0, rankedCutoff)}
          {rows.length <= rankedCutoff ? null : (
            // The way to the rest is the table's last line, inside its
            // frame: flush with the names at rest, and hovering grows the
            // padding back, the same move the list headers make.
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={6}>
                <Button
                  className="px-0 hover:px-2 focus-visible:px-2"
                  onClick={() => setExpanded(!expanded)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  {expanded ? "Show less" : `Show all ${rows.length}`}
                </Button>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableFrame>
  )
}

function FigureHead({ children }: { children: ReactNode }) {
  return <TableHead className={figureClassName}>{children}</TableHead>
}

function FigureCell({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <TableCell className={cn(figureClassName, className)}>{children}</TableCell>
  )
}

/** One line of either ranking. The name takes whatever width the figures
 *  leave, down to a floor past which the table scrolls instead, and gives
 *  way with an ellipsis rather than pushing them off the edge; the bar is
 *  drawn against the leader so the biggest row fills its cell and the rest
 *  read against it. A window that cost nothing has no shares, and no runs
 *  no average. */
function RankedRow({
  caption,
  entry,
  leader,
  total,
}: {
  caption: ReactNode
  entry: RankedEntry
  leader: number
  total: number
}) {
  const cost = usageCostPerRun(entry.micros, entry.ended)

  return (
    <TableRow>
      <TableCell className="w-full min-w-36 max-w-0 truncate">
        {caption}
      </TableCell>
      <FigureCell>{entry.ended}</FigureCell>
      <FigureCell className={entry.failed > 0 ? "text-destructive" : ""}>
        {entry.failed}
      </FigureCell>
      <FigureCell className="font-medium">{formatUsd(entry.micros)}</FigureCell>
      <FigureCell>{cost === undefined ? "—" : formatUsd(cost)}</FigureCell>
      <TableCell>
        <div className="flex items-center justify-end gap-2 tabular-nums">
          <span>{usagePercent(entry.micros, total) ?? "—"}</span>
          <Progress className="w-16" value={usageShare(entry.micros, leader)} />
        </div>
      </TableCell>
    </TableRow>
  )
}

/** What spent the window's money. An automation that still exists is a
 *  link; one that has since been deleted keeps its name as plain text,
 *  because its spend is history and there is nothing left to open. */
export function UsageContributors({
  automations,
  total,
}: {
  automations: UsageContributor[]
  total: number
}) {
  const leader = automations[0]?.micros ?? 0

  return (
    <RankedTable
      noun="Source"
      rows={automations.map((entry) => (
        <RankedRow
          caption={
            entry.id === undefined ? (
              entry.label
            ) : (
              <Link
                className={nameLinkClassName}
                title={entry.label}
                to="/automations"
              >
                {entry.label}
              </Link>
            )
          }
          entry={entry}
          key={entry.id ?? entry.label}
          leader={leader}
          total={total}
        />
      ))}
    />
  )
}

/** Where the money sits one level down, in the charts' own colours: each
 *  folder row a whole subtree and a way further in — the same view, scoped
 *  to that folder — beside the scope's own rows and the unnamed rest. */
export function UsageFolders({
  days,
  segments,
  total,
}: {
  days: UsageDays
  segments: UsageSegment[]
  total: number
}) {
  const leader = segments[0]?.micros ?? 0

  return (
    <RankedTable
      noun="Folder"
      rows={segments.map((segment, rank) => (
        <RankedRow
          caption={
            <span className="flex items-center gap-2">
              <SegmentSwatch color={usageSegmentColor(segment, rank)} />
              {segment.folderId === undefined ? (
                <span className="truncate">{segment.label}</span>
              ) : (
                <Link
                  className={cn(nameLinkClassName, "truncate")}
                  params={{ folderId: segment.folderId }}
                  search={{ days }}
                  title={segment.label}
                  to="/folders/$folderId/usage"
                >
                  {segment.label}
                </Link>
              )}
            </span>
          }
          entry={segment}
          key={segment.key}
          leader={leader}
          total={total}
        />
      ))}
    />
  )
}
