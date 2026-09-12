import { type ReferenceKind } from "@contracts/replies/parts"
import { Folder, type LucideIcon, Timeline } from "lucide-react"
import { resourceDestination, resourcePresentation } from "../folders/types"
import { type ConsoleDestination } from "../shell/location"
import { type ReferenceTarget } from "./index"

/** References share the icons and nouns used by their resource lists. */
export function referencePresentation(
  kind: ReferenceKind,
  name: string
): { icon: LucideIcon; label: string } {
  switch (kind) {
    case "folder":
      return { icon: Folder, label: "Folder" }
    case "run":
      return { icon: Timeline, label: "Run" }
    default:
      return resourcePresentation({ type: kind, name })
  }
}

/** The console page a referenced target opens: a run reveals its row on
 *  the Activity page, everything else has a page of its own. */
export function referenceDestination(
  target: ReferenceTarget
): ConsoleDestination {
  switch (target.kind) {
    case "folder":
      return { to: "/folders/$folderId", params: { folderId: target.id } }
    case "run":
      return { to: "/runs", search: { run: target.id } }
    default:
      return resourceDestination({ type: target.kind, id: target.id })
  }
}
