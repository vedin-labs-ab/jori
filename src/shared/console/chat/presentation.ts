import { type ReferenceKind } from "@contracts/replies/parts"
import { Folder, type LucideIcon, Timeline } from "lucide-react"
import { resourcePresentation } from "../folders/types"
import { type ConsoleDestination } from "../shell/location"
import { type ReferenceTarget } from "./types"

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

/** The console page a referenced target opens: a run reveals its row on
 *  the Activity page, everything else has a page of its own. */
export function referenceDestination(
  target: ReferenceTarget
): ConsoleDestination {
  switch (target.kind) {
    case "file":
      return { to: "/files/$fileId", params: { fileId: target.id } }
    case "folder":
      return { to: "/folders/$folderId", params: { folderId: target.id } }
    case "job":
      return { to: "/jobs/$jobId", params: { jobId: target.id } }
    case "run":
      return { to: "/runs", search: { run: target.id } }
    case "store":
      return { to: "/stores/$storeId", params: { storeId: target.id } }
    case "table":
      return { to: "/tables/$tableId", params: { tableId: target.id } }
  }
}
