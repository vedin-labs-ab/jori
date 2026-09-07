import { lazy, Suspense, useCallback, useMemo } from "react"
import { ChatPaneBody } from "@/shared/console/chat/pane/body"
import { type OpenTarget } from "@/shared/console/chat/pane/tabs"
import { type ChatRun, type ReferenceTarget } from "@/shared/console/chat/types"
import { type FolderDetail } from "@/shared/console/folders/types"
import { ConsoleListLoading } from "@/shared/console/list/loading"
import { displayNowForRun, useExecutionClock } from "@/shared/console/runs/time"
import { type TableDetail, type TableRow } from "@/shared/console/tables/types"
import { useNow } from "@/shared/console/time"
import { resolveReference } from "../../derive/chat"
import { folderDetail } from "../../derive/folders"
import { tableDetail, tableRows } from "../../derive/materials"
import { chatContext } from "../../fixtures/chat"
import { liveDraft } from "../../state/chat"
import { useDemoWorkspace } from "../../workspace"
import { useDemoFolderContents } from "../contents"
import { useDemoGrid } from "../materials/rows"
import { useRunRowSlots } from "../slots"

// A job's overview carries the brief's markdown codec, so it arrives with
// the job's page module, the way the router loads it.
const JobPaneBody = lazy(async () => ({
  default: (await import("../jobs/detail")).JobPaneBody,
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
  switch (target.kind) {
    case "table":
      return <DemoPaneTable tableId={target.id} />
    case "job":
      return (
        <Suspense fallback={<ConsoleListLoading />}>
          <JobPaneBody jobId={target.id} />
        </Suspense>
      )
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

function DemoPaneTable({ tableId }: { tableId: string }) {
  const { state } = useDemoWorkspace()
  const table = useMemo(() => tableDetail(state, tableId), [state, tableId])
  const rows = useMemo(() => tableRows(state, tableId), [state, tableId])

  return table === undefined ? null : <DemoPaneGrid rows={rows} table={table} />
}

function DemoPaneGrid({
  rows,
  table,
}: {
  rows: TableRow[]
  table: TableDetail
}) {
  const grid = useDemoGrid(table, rows)

  return (
    <ChatPaneBody
      material={{
        kind: "table",
        grid: grid.props,
        overlays: grid.overlays,
        rowCount: rows.length,
      }}
    />
  )
}

/** The run's row out of the workspace, open to the same detail the
 *  Activity page shows. */
function DemoPaneRun({ runId }: { runId: string }) {
  const { actions, state } = useDemoWorkspace()
  const execution = state.runs.find((run) => run.id === runId)
  const runs = useMemo(
    () => (execution === undefined ? [] : [execution]),
    [execution]
  )
  const now = useExecutionClock(runs)
  const slots = useRunRowSlots(actions, state.activity)

  if (execution === undefined) {
    return null
  }

  return (
    <ChatPaneBody
      material={{
        kind: "run",
        execution,
        now: displayNowForRun(execution, now),
        slots,
      }}
    />
  )
}

function DemoPaneFolder({ folderId }: { folderId: string }) {
  const { state } = useDemoWorkspace()
  const folder = useMemo(() => folderDetail(state, folderId), [state, folderId])

  return folder === undefined ? null : <DemoPaneContents folder={folder} />
}

function DemoPaneContents({ folder }: { folder: FolderDetail }) {
  const listing = useDemoFolderContents(folder)

  return (
    <ChatPaneBody
      material={{
        kind: "folder",
        contents: listing.contents,
        overlays: listing.overlays,
      }}
    />
  )
}

/** Another conversation's turns out of the workspace, with the reply
 *  being written to it as far as it has come. */
function DemoPaneChat({
  conversationId,
  onOpenReference,
}: {
  conversationId: string
  onOpenReference: OpenTarget
}) {
  const { actions, state } = useDemoWorkspace()
  const conversation = state.chat.conversations.find(
    (candidate) => candidate.id === conversationId
  )
  const live = state.chat.live
  const run: ChatRun | null =
    live?.conversationId === conversationId ? live.run : null
  const now = useNow(60_000)
  const resolve = useCallback(
    (target: ReferenceTarget) => resolveReference(state, target),
    [state]
  )

  if (conversation === undefined) {
    return null
  }

  return (
    <ChatPaneBody
      material={{
        kind: "chat",
        thread: {
          draft: liveDraft(state.chat, conversationId),
          hasMore: false,
          isLoading: false,
          live: run,
          messages: conversation.messages,
          now,
          onChoose: (messageId, answers, text) =>
            actions.sendChatMessage(text, conversationId, {
              answer: { messageId, answers },
            }),
          onLoadMore: () => undefined,
          onOpenReference,
          resolveReference: resolve,
          usage: chatContext,
        },
      }}
    />
  )
}
