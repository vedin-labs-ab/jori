import { formatUsd } from "@contracts/billing"
import { Link } from "@tanstack/react-router"
import { type ReactNode, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import {
  type UsageContributor,
  type UsageDays,
  type UsageFolder,
  type UsageOverview,
  usageCostPerRun,
  usagePercent,
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
    <div className="grid gap-2">
      {/* The section's own edge is the table's: cells shed the outer padding
          so names sit on the title's grid and figures on the right edge. */}
      <Table className="[&_td:first-child]:pl-0 [&_td:last-child]:pr-0 [&_th:first-child]:pl-0 [&_th:last-child]:pr-0">
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
        <TableBody>{expanded ? rows : rows.slice(0, rankedCutoff)}</TableBody>
      </Table>
      {rows.length <= rankedCutoff ? null : (
        // Flush with the names at rest; hovering grows the padding back,
        // the same move the list headers make.
        <Button
          className="justify-self-start px-0 hover:px-2 focus-visible:px-2"
          onClick={() => setExpanded(!expanded)}
          size="sm"
          type="button"
          variant="ghost"
        >
          {expanded ? "Show less" : `Show all ${rows.length}`}
        </Button>
      )}
    </div>
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
 *  leave and gives way with an ellipsis rather than pushing them off the
 *  edge; the bar is drawn against the leader so the biggest row fills its
 *  cell and the rest read against it. A window that cost nothing has no
 *  shares, and no runs no average. */
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
      <TableCell className="w-full max-w-0 truncate">{caption}</TableCell>
      <FigureCell>{entry.ended}</FigureCell>
      <FigureCell className={entry.failed > 0 ? "text-destructive" : ""}>
        {entry.failed}
      </FigureCell>
      <FigureCell className="font-medium">{formatUsd(entry.micros)}</FigureCell>
      <FigureCell>{cost === undefined ? "—" : formatUsd(cost)}</FigureCell>
      <TableCell>
        <div className="flex items-center justify-end gap-2 tabular-nums">
          <span>{usagePercent(entry.micros, total) ?? "—"}</span>
          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-muted-foreground/50"
              style={{ width: `${usageShare(entry.micros, leader)}%` }}
            />
          </div>
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

/** Where the money sits one level down, each row a whole subtree and each
 *  a way further in — the same view, scoped to that folder. Work that
 *  answers to no folder ranks beside them as its own row. */
export function UsageFolders({
  days,
  folders,
  total,
  unfiled,
}: {
  days: UsageDays
  folders: UsageFolder[]
  total: number
  unfiled: UsageOverview["unfiled"]
}) {
  const leader = Math.max(folders[0]?.micros ?? 0, unfiled?.micros ?? 0)
  const rows = folders.map((folder) => (
    <RankedRow
      caption={
        <Link
          className={nameLinkClassName}
          params={{ folderId: folder.folderId }}
          search={{ days }}
          title={folder.name}
          to="/folders/$folderId/usage"
        >
          {folder.name}
        </Link>
      }
      entry={folder}
      key={folder.folderId}
      leader={leader}
      total={total}
    />
  ))

  if (unfiled !== null && unfiled.micros > 0) {
    rows.push(
      <RankedRow
        caption="Unfiled"
        entry={unfiled}
        key="unfiled"
        leader={leader}
        total={total}
      />
    )
  }

  return <RankedTable noun="Folder" rows={rows} />
}
