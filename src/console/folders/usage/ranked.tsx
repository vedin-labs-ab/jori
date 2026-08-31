import { formatUsd } from "@contracts/billing"
import { Link } from "@tanstack/react-router"
import { type ReactNode } from "react"
import { Progress } from "@/components/ui/progress"
import { countLabel } from "../../shared/count"
import {
  type UsageContributor,
  type UsageDays,
  type UsageFolder,
  type UsageOverview,
  usageShare,
} from "./types"

// The two ranked lists the page ends on: who spent it, and where it sits.
// Both are the same row — a caption, an amount, and a bar proportional to
// the leader — so the eye compares them the same way.

const nameLinkClassName =
  "min-w-0 truncate underline-offset-2 hover:underline focus-visible:underline"

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

/** What spent the window's money. An automation that still exists is a
 *  link; one that has since been deleted keeps its caption as plain text,
 *  because its spend is history and there is nothing left to open. */
export function UsageContributors({
  automations,
  rest,
}: {
  automations: UsageContributor[]
  rest: UsageOverview["rest"]
}) {
  const leader = automations[0]?.micros ?? 0

  return (
    <ul className="grid gap-3">
      {automations.map((entry) => (
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
          detail={runsDetail(entry)}
          key={entry.id ?? entry.label}
          micros={entry.micros}
          share={usageShare(entry.micros, leader)}
        />
      ))}
      {rest.count === 0 ? null : (
        <li className="flex items-baseline justify-between gap-3 text-muted-foreground text-sm">
          <span>+{rest.count} more</span>
          <span className="tabular-nums">{formatUsd(rest.micros)}</span>
        </li>
      )}
    </ul>
  )
}

/** Where the money sits one level down, each row a whole subtree and each
 *  a way further in — the same view, scoped to that folder. */
export function UsageFolders({
  days,
  folders,
  unfiled,
}: {
  days: UsageDays
  folders: UsageFolder[]
  unfiled: UsageOverview["unfiled"]
}) {
  const unfiledMicros = unfiled?.micros ?? 0
  const leader = Math.max(folders[0]?.micros ?? 0, unfiledMicros)

  return (
    <ul className="grid gap-3">
      {folders.map((folder) => (
        <RankedRow
          caption={
            <Link
              className={nameLinkClassName}
              params={{ folderId: folder.folderId }}
              search={{ usage: days }}
              title={folder.name}
              to="/folders/$folderId"
            >
              {folder.name}
            </Link>
          }
          key={folder.folderId}
          micros={folder.micros}
          share={usageShare(folder.micros, leader)}
        />
      ))}
      {unfiled === null || unfiledMicros === 0 ? null : (
        <RankedRow
          caption={<span className="min-w-0 truncate">Unfiled</span>}
          detail={unfiledDetail(unfiled)}
          micros={unfiledMicros}
          share={usageShare(unfiledMicros, leader)}
        />
      )}
    </ul>
  )
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
function unfiledDetail(unfiled: { ended: number; failed: number }) {
  const runs = runsDetail(unfiled)

  return runs === undefined
    ? "Not filed in any folder"
    : `${runs} · not filed in any folder`
}
