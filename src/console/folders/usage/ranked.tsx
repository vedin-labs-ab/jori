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
// it sits. Both end on the same column — the row's share of the window, as
// a figure and as a bar against the leader — so the eye compares them the
// same way, and both open the same way when there is more than a glance's
// worth.

/** A ranking is read from the top, so the top is what a table opens with.
 *  Five leaves the two tables a comparable height beside each other. */
const rankedCutoff = 5

const nameLinkClassName =
  "underline-offset-2 hover:underline focus-visible:underline"

const figureClassName = "text-right tabular-nums"

/** The leaders, and the rest on request. Both tables hand their rows in
 *  already built, so the cutoff is decided in one place for both. */
function RankedTable({ head, rows }: { head: ReactNode; rows: ReactNode[] }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="grid gap-2">
      {/* The section's own edge is the table's: cells shed the outer padding
          so names sit on the title's grid and figures on the right edge. */}
      <Table className="[&_td:first-child]:pl-0 [&_td:last-child]:pr-0 [&_th:first-child]:pl-0 [&_th:last-child]:pr-0">
        <TableHeader>
          <TableRow className="hover:bg-transparent">{head}</TableRow>
        </TableHeader>
        <TableBody>{expanded ? rows : rows.slice(0, rankedCutoff)}</TableBody>
      </Table>
      {rows.length <= rankedCutoff ? null : (
        <Button
          className="justify-self-start"
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

/** The row's name takes whatever width the figures leave, and gives way
 *  with an ellipsis rather than pushing them off the edge. */
function NameCell({ children }: { children: ReactNode }) {
  return <TableCell className="w-full max-w-0 truncate">{children}</TableCell>
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

/** The row's share of the window as a figure, beside a bar drawn against
 *  the leader so the biggest row fills its cell and the rest read against
 *  it. A window that cost nothing has no shares. */
function ShareCell({
  leader,
  micros,
  total,
}: {
  leader: number
  micros: number
  total: number
}) {
  return (
    <TableCell>
      <div className="flex items-center justify-end gap-2 tabular-nums">
        <span>{usagePercent(micros, total) ?? "—"}</span>
        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-muted-foreground/50"
            style={{ width: `${usageShare(micros, leader)}%` }}
          />
        </div>
      </div>
    </TableCell>
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
      head={
        <>
          <TableHead>Source</TableHead>
          <FigureHead>Runs</FigureHead>
          <FigureHead>Failed</FigureHead>
          <FigureHead>Spend</FigureHead>
          <FigureHead>Cost / run</FigureHead>
          <FigureHead>Share</FigureHead>
        </>
      }
      rows={automations.map((entry) => (
        <TableRow key={entry.id ?? entry.label}>
          <NameCell>
            {entry.id === undefined ? (
              entry.label
            ) : (
              <Link
                className={nameLinkClassName}
                title={entry.label}
                to="/automations"
              >
                {entry.label}
              </Link>
            )}
          </NameCell>
          <FigureCell>{entry.ended}</FigureCell>
          <FigureCell className={entry.failed > 0 ? "text-destructive" : ""}>
            {entry.failed}
          </FigureCell>
          <FigureCell className="font-medium">
            {formatUsd(entry.micros)}
          </FigureCell>
          <FigureCell>{costPerRun(entry)}</FigureCell>
          <ShareCell leader={leader} micros={entry.micros} total={total} />
        </TableRow>
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
  const unfiledMicros = unfiled?.micros ?? 0
  const leader = Math.max(folders[0]?.micros ?? 0, unfiledMicros)
  const rows = folders.map((folder) => (
    <TableRow key={folder.folderId}>
      <NameCell>
        <Link
          className={nameLinkClassName}
          params={{ folderId: folder.folderId }}
          search={{ days }}
          title={folder.name}
          to="/folders/$folderId/usage"
        >
          {folder.name}
        </Link>
      </NameCell>
      <FigureCell className="font-medium">
        {formatUsd(folder.micros)}
      </FigureCell>
      <ShareCell leader={leader} micros={folder.micros} total={total} />
    </TableRow>
  ))

  if (unfiledMicros > 0) {
    rows.push(
      <TableRow key="unfiled">
        <NameCell>Unfiled</NameCell>
        <FigureCell className="font-medium">
          {formatUsd(unfiledMicros)}
        </FigureCell>
        <ShareCell leader={leader} micros={unfiledMicros} total={total} />
      </TableRow>
    )
  }

  return (
    <RankedTable
      head={
        <>
          <TableHead>Folder</TableHead>
          <FigureHead>Spend</FigureHead>
          <FigureHead>Share</FigureHead>
        </>
      }
      rows={rows}
    />
  )
}

function costPerRun(entry: UsageContributor) {
  const cost = usageCostPerRun(entry.micros, entry.ended)

  return cost === undefined ? "—" : formatUsd(cost)
}
