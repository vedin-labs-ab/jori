import {
  type Visibility,
  type VisibilityMode,
  visibilityModeMarks,
} from "@contracts/visibility"
import { RowMark } from "../list/mark"
import { visibilityIcon, visibilityLabel } from "./marks"

// The quiet visibility vocabulary every material surface shares: one icon
// per mode, named in a tooltip.

export function VisibilityIcon({
  className,
  mode,
}: {
  className?: string
  mode: VisibilityMode
}) {
  const Icon = visibilityIcon(mode)

  return <Icon className={className} aria-hidden />
}

/** Muted visibility icon with the audience in a tooltip and for screen
 *  readers: the one treatment every list row and breadcrumb uses, so a
 *  team-scoped folder and a team-scoped table wear the same mark.
 *  Organization-wide is the default and stays unmarked in lists, so
 *  callers render this for every other mode. */
export function VisibilityMark({
  visibility,
}: {
  visibility: Visibility | VisibilityMode
}) {
  const value: Visibility =
    typeof visibility === "string" ? modeOnly(visibility) : visibility
  // A bare mode says nothing about how many it names, so it stays a mode.
  const label =
    typeof visibility === "string"
      ? visibilityModeMarks[visibility]
      : visibilityLabel(value)

  return <RowMark icon={<VisibilityIcon mode={value.mode} />} label={label} />
}

function modeOnly(mode: VisibilityMode): Visibility {
  if (mode === "people") {
    return { mode, personIds: [] }
  }

  if (mode === "teams") {
    return { mode, teamIds: [] }
  }

  return { mode }
}
