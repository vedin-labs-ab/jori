import { type VisibilityMode } from "@contracts/visibility"
import { Building2, FolderLock, Group, Lock, Users } from "lucide-react"

// One icon and one wording per visibility mode, for every surface that
// marks who may see something. Teams wear the same grouped-objects icon
// as the settings nav, keeping them apart from people at a glance.

const visibilityIcons = {
  private: Lock,
  people: Users,
  teams: Group,
  organization: Building2,
  folder: FolderLock,
} as const

export function visibilityIcon(mode: VisibilityMode | "folder") {
  return visibilityIcons[mode]
}
