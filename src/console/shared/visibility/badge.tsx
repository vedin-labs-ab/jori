import {
  type Visibility,
  type VisibilityMode,
  visibilityModeMarks,
} from "@contracts/visibility"
import { Building2, Group, Lock, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// The quiet visibility vocabulary every material surface shares: one icon
// per mode, named in a tooltip. Teams wear the same grouped-objects icon
// as the settings nav, keeping them apart from people at a glance.

const visibilityIcons = {
  private: Lock,
  people: Users,
  teams: Group,
  organization: Building2,
} as const

/** Short audience sentence for tooltips. */
function describeVisibility(visibility: Visibility) {
  if (visibility.mode === "people") {
    const count = visibility.personIds.length

    return count === 1 ? "1 person" : `${count} people`
  }

  if (visibility.mode === "teams") {
    const count = visibility.teamIds.length

    return count === 1 ? "1 team" : `${count} teams`
  }

  return visibilityModeMarks[visibility.mode]
}

export function VisibilityIcon({
  className,
  mode,
}: {
  className?: string
  mode: VisibilityMode
}) {
  const Icon = visibilityIcons[mode]

  return <Icon className={className} aria-hidden />
}

/** Muted visibility icon with the audience in a tooltip and for screen
 *  readers: the list-row and breadcrumb treatment. Organization-wide is
 *  the default and stays unmarked in lists, so callers usually render this
 *  for every other mode. */
export function VisibilityMark({
  visibility,
}: {
  visibility: Visibility | VisibilityMode
}) {
  const value: Visibility =
    typeof visibility === "string" ? modeOnly(visibility) : visibility
  const label = `${visibilityModeMarks[value.mode]}${detailSuffix(value)}`

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="shrink-0 text-muted-foreground">
          <VisibilityIcon className="size-4" mode={value.mode} />
          <span className="sr-only">{label}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export function VisibilityBadge({
  visibility,
}: {
  visibility: Visibility | VisibilityMode
}) {
  const value: Visibility =
    typeof visibility === "string" ? modeOnly(visibility) : visibility

  return (
    <Badge variant={value.mode === "organization" ? "secondary" : "outline"}>
      <VisibilityIcon className="size-3" mode={value.mode} />
      {visibilityModeMarks[value.mode]}
    </Badge>
  )
}

function detailSuffix(visibility: Visibility) {
  if (visibility.mode === "people" || visibility.mode === "teams") {
    return ` · ${describeVisibility(visibility)}`
  }

  return ""
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
