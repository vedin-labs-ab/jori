import { type ReferenceKind } from "@contracts/replies/parts"
import { Folder, type LucideIcon, Timeline } from "lucide-react"
import { resourcePresentation } from "../folders/types"

/** How a referenced target presents: the icon and noun the folder lists
 *  give a filed resource, and the folder tree's and Activity's own for
 *  the two kinds that are not filed. */
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
