import {
  type Visibility,
  type VisibilityMode,
  visibilityModeMarks,
} from "@contracts/visibility"
import { Building2, Group, Lock, Users } from "lucide-react"

// One icon and one wording per visibility mode, for every surface that
// marks who may see something. Teams wear the same grouped-objects icon
// as the settings nav, keeping them apart from people at a glance.

const visibilityIcons = {
  private: Lock,
  people: Users,
  teams: Group,
  organization: Building2,
} as const

export function visibilityIcon(mode: VisibilityMode) {
  return visibilityIcons[mode]
}

/** The mark's wording: the mode, and how many it names when it names
 *  people or teams. */
export function visibilityLabel(visibility: Visibility) {
  if (visibility.mode === "people") {
    const count = visibility.personIds.length

    return `${visibilityModeMarks.people} · ${count === 1 ? "1 person" : `${count} people`}`
  }

  if (visibility.mode === "teams") {
    const count = visibility.teamIds.length

    return `${visibilityModeMarks.teams} · ${count === 1 ? "1 team" : `${count} teams`}`
  }

  return visibilityModeMarks[visibility.mode]
}
