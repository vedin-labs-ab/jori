import {
  isUserVisibleToolPermission,
  toolPermissions,
} from "@contracts/permissions"
import { type ToolPermission } from "@/shared/console/tools/model"

/** Copperline's tool policy: the catalog at its defaults, the way an
 *  organization that has changed nothing sees it. */
export const demoPermissions: ToolPermission[] = toolPermissions
  .filter((permission) => isUserVisibleToolPermission(permission.tool))
  .map(({ usage: _usage, ...permission }) => ({
    ...permission,
    mode: permission.defaultMode,
    overrideMode: null,
  }))

/** The skills Copperline has written, for `/` mentions. */
export const demoSkills: readonly string[] = [
  "reminders",
  "release-notes",
  "triage",
]
