import { type ReferenceKind } from "@contracts/replies/parts"
import { type ReactNode } from "react"
import { PaneFile } from "./file"
import { PaneJob } from "./job"
import { PaneStore } from "./store"
import { PaneTable } from "./table"

export type PaneBody = (props: {
  id: string
  organizationId: string
}) => ReactNode

/** What each kind of target shows beside the chat: the material views
 *  bound to Convex the way their pages are. A folder and a run have no
 *  view for the pane; the header's link is the way to them. */
export const paneBodies: Record<ReferenceKind, PaneBody | null> = {
  file: PaneFile,
  folder: null,
  job: PaneJob,
  run: null,
  store: PaneStore,
  table: PaneTable,
}
