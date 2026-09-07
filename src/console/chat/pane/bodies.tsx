import { type ReferenceKind } from "@contracts/replies/parts"
import { type ComponentType, lazy, type ReactNode, Suspense } from "react"
import { type OpenTarget } from "@/shared/console/chat/pane/tabs"
import { ConsoleListLoading } from "@/shared/console/list/loading"

type PaneBodyProps = {
  id: string
  /** Opens a resource the body names in the pane's tabs, beside it. */
  onOpenReference: OpenTarget
  organizationId: string
}

export type PaneBody = (props: PaneBodyProps) => ReactNode

/** What each kind of target shows beside the chat: the material views
 *  bound to Convex the way their pages are. Each binding carries its
 *  page's hooks — the grid's row pages, the job's overview, the store's
 *  writes — so it arrives with the first tab of its kind, and the chat's
 *  own chunk carries none of them. */
export const paneBodies: Record<ReferenceKind, PaneBody> = {
  chat: arriving(async () => (await import("./chat")).PaneChat),
  file: arriving(async () => (await import("./file")).PaneFile),
  folder: arriving(async () => (await import("./folder")).PaneFolder),
  job: arriving(async () => (await import("./job")).PaneJob),
  run: arriving(async () => (await import("./run")).PaneRun),
  store: arriving(async () => (await import("./store")).PaneStore),
  table: arriving(async () => (await import("./table")).PaneTable),
}

/** A binding loaded on first use, shown as the list's loading state
 *  while its chunk is on its way. */
function arriving(load: () => Promise<ComponentType<PaneBodyProps>>): PaneBody {
  const Body = lazy(async () => ({ default: await load() }))

  return (props) => (
    <Suspense fallback={<ConsoleListLoading />}>
      <Body {...props} />
    </Suspense>
  )
}
