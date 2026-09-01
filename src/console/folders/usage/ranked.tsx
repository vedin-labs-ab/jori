import { formatUsd } from "@contracts/billing"
import { Link } from "@tanstack/react-router"
import { type ReactNode, useState } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { countLabel } from "../../shared/count"
import {
  type UsageContributor,
  type UsageDays,
  type UsageFolder,
  type UsageOverview,
  usageShare,
  usageSpendShare,
} from "./types"

// The two ranked lists the page ends on: who spent it, and where it sits.
// Both are the same row — a caption, an amount, a bar proportional to the
// leader, and its share of the window — so the eye compares them the same
// way, and both open the same way when there is more than a glance's worth.

const nameLinkClassName =
  "min-w-0 truncate underline-offset-2 hover:underline focus-visible:underline"

/** A ranking is read from the top, so the top is what a list opens with.
 *  Five leaves the two lists a comparable height beside each other. */
const rankedCutoff = 5

function RankedRow({
  caption,
  detail,
  micros,
  share,
}: {
  caption: ReactNode
  detail?: string
  micros: number
  share: number
}) {
  return (
    <li className="grid gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        {caption}
        <span className="shrink-0 tabular-nums">{formatUsd(micros)}</span>
      </div>
      <Progress
        className="[&>[data-slot=progress-indicator]]:bg-muted-foreground/40"
        value={share}
      />
      {detail === undefined ? null : (
        <p className="text-muted-foreground text-xs tabular-nums">{detail}</p>
      )}
    </li>
  )
}

/** The leaders, and the rest on request. Both lists hand their rows in
 *  already built, so the cutoff is decided in one place for both. */
function RankedList({ rows }: { rows: ReactNode[] }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="grid gap-3">
      <ul className="grid gap-3">
        {expanded ? rows : rows.slice(0, rankedCutoff)}
      </ul>
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

/** What spent the window's money. An automation that still exists is a
 *  link; one that has since been deleted keeps its caption as plain text,
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
    <RankedList
      rows={automations.map((entry) => (
        <RankedRow
          caption={
            entry.id === undefined ? (
              <span className="min-w-0 truncate">{entry.label}</span>
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
          detail={detailOf(
            usageSpendShare(entry.micros, total),
            runsDetail(entry)
          )}
          key={entry.id ?? entry.label}
          micros={entry.micros}
          share={usageShare(entry.micros, leader)}
        />
      ))}
    />
  )
}

/** Where the money sits one level down, each row a whole subtree and each
 *  a way further in — the same view, scoped to that folder. */
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
      detail={usageSpendShare(folder.micros, total)}
      key={folder.folderId}
      micros={folder.micros}
      share={usageShare(folder.micros, leader)}
    />
  ))

  if (unfiled !== null && unfiledMicros > 0) {
    rows.push(
      <RankedRow
        caption={<span className="min-w-0 truncate">Unfiled</span>}
        detail={unfiledDetail(unfiled, total)}
        key="unfiled"
        micros={unfiledMicros}
        share={usageShare(unfiledMicros, leader)}
      />
    )
  }

  return <RankedList rows={rows} />
}

/** One detail line from whichever of its parts the row actually has. */
function detailOf(...parts: (string | undefined)[]) {
  const written = parts.filter((part) => part !== undefined)

  return written.length === 0 ? undefined : written.join(" · ")
}

function runsDetail(entry: { ended: number; failed: number }) {
  if (entry.ended === 0 && entry.failed === 0) {
    return undefined
  }

  const runs = countLabel(entry.ended, "run")

  return entry.failed === 0 ? runs : `${runs} · ${entry.failed} failed`
}

/** Work that answers to no folder: someone asking Jori directly, and
 *  anything whose folder was deleted with no parent left to inherit it. */
function unfiledDetail(
  unfiled: { ended: number; failed: number; micros: number },
  total: number
) {
  const detail = detailOf(
    usageSpendShare(unfiled.micros, total),
    runsDetail(unfiled)
  )

  return detail === undefined
    ? "Not filed in any folder"
    : `${detail} · not filed in any folder`
}
