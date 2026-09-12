import { lazy, type ReactNode, Suspense } from "react"
import { type OpenTarget } from "@/shared/console/chat/pane/tabs"
import { ConsoleListLoading } from "@/shared/console/list/loading"
import { type ReferenceTarget } from "../../../../../shared/console/references"

// Each kind's binding carries its page's hooks — the grid's rows, the
// job's overview with the brief's markdown codec, the folder's listing —
// so it arrives with the first tab of its kind, the way the router loads
// the page, and the chat's own chunk carries none of them.
const DemoPaneTable = lazy(async () => ({
  default: (await import("./table")).DemoPaneTable,
}))
const JobPaneBody = lazy(async () => ({
  default: (await import("../../jobs/detail")).JobPaneBody,
}))
const DemoPaneRun = lazy(async () => ({
  default: (await import("./run")).DemoPaneRun,
}))
const DemoPaneFolder = lazy(async () => ({
  default: (await import("./folder")).DemoPaneFolder,
}))
const DemoPaneChat = lazy(async () => ({
  default: (await import("./chat")).DemoPaneChat,
}))

/** What a reply's target shows in the pane beside the chat: the console's
 *  own view for each kind, over the workspace the way its page is. */
export function DemoPaneBody({
  onOpenReference,
  target,
}: {
  onOpenReference: OpenTarget
  target: ReferenceTarget
}) {
  return (
    <Suspense fallback={<ConsoleListLoading />}>
      {bodyFor(target, onOpenReference)}
    </Suspense>
  )
}

function bodyFor(
  target: ReferenceTarget,
  onOpenReference: OpenTarget
): ReactNode {
  switch (target.kind) {
    case "table":
      return <DemoPaneTable tableId={target.id} />
    case "job":
      return <JobPaneBody jobId={target.id} />
    case "run":
      return <DemoPaneRun runId={target.id} />
    case "folder":
      return <DemoPaneFolder folderId={target.id} />
    case "chat":
      return (
        <DemoPaneChat
          conversationId={target.id}
          onOpenReference={onOpenReference}
        />
      )
    default:
      return null
  }
}
