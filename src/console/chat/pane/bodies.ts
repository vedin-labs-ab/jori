import { type ReferenceKind } from "@contracts/replies/parts"
import { type ReactNode } from "react"
import { type OpenTarget } from "@/shared/console/chat/pane/tabs"
import { PaneChat } from "./chat"
import { PaneFile } from "./file"
import { PaneFolder } from "./folder"
import { PaneJob } from "./job"
import { PaneRun } from "./run"
import { PaneStore } from "./store"
import { PaneTable } from "./table"

export type PaneBody = (props: {
  id: string
  /** Opens a resource the body names in the pane's tabs, beside it. */
  onOpenReference: OpenTarget
  organizationId: string
}) => ReactNode

/** What each kind of target shows beside the chat: the material views
 *  bound to Convex the way their pages are. */
export const paneBodies: Record<ReferenceKind, PaneBody> = {
  chat: PaneChat,
  file: PaneFile,
  folder: PaneFolder,
  job: PaneJob,
  run: PaneRun,
  store: PaneStore,
  table: PaneTable,
}
