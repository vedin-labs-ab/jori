import { type ComponentProps, lazy, type ReactNode, Suspense } from "react"
import { DropdownMenuContent } from "@/components/ui/dropdown-menu"
import { countLabel } from "../../count"
import { type FileSave } from "../../files/editor/section"
import { noSiblings } from "../../files/siblings"
import { type FileDetail } from "../../files/types"
import { FolderContents } from "../../folders/list/contents"
import { JobDetail, type JobDetailProps } from "../../jobs/detail"
import { ConsolePageLayout } from "../../layout"
import { ConsoleListFooter, ConsoleListLayout } from "../../list/frame"
import { ConsoleListLoading } from "../../list/loading"
import { menuWidth } from "../../menu"
import { ExecutionRow, type RunRowSlots } from "../../runs/row"
import { type ExecutionItem } from "../../runs/types"
import { type SchemaWrite } from "../../stores/schema/dialog"
import { type StoreDetail } from "../../stores/types"
import { type ValueWrite } from "../../stores/value/editor"
import { RowGrid } from "../../tables/grid"
import { ChatThread } from "../thread"

// The store's editor and the file's viewer carry CodeMirror and the schema
// builder; they arrive only once a tab holds one, so the chat's own chunk
// stays light.
const StoreValue = lazy(() =>
  import("../../stores/value/section").then((module) => ({
    default: module.StoreValue,
  }))
)
const FileViewer = lazy(() =>
  import("../../files/body").then((module) => ({ default: module.FileBody }))
)

/** A material as the pane shows it: the host's data for the view its
 *  page mounts, less the page's chrome. */
export type ChatPaneMaterial =
  | { kind: "job"; detail: JobDetailProps }
  | {
      kind: "table"
      grid: ComponentProps<typeof RowGrid>
      /** The dialogs and bars the grid's actions open, mounted beside it. */
      overlays?: ReactNode
      rowCount: number
    }
  | {
      kind: "store"
      onWriteSchema: SchemaWrite
      onWriteValue: ValueWrite
      store: StoreDetail
    }
  | { kind: "file"; file: FileDetail; onSave: FileSave }
  | {
      kind: "run"
      execution: ExecutionItem
      now: number
      /** The row's detail and stop control, as the Activity list hands
       *  them to every row. */
      slots: RunRowSlots
    }
  | {
      kind: "folder"
      contents: ComponentProps<typeof FolderContents>
      /** The dialogs the listing's menus open, mounted beside it. */
      overlays?: ReactNode
    }
  | {
      kind: "chat"
      /** The other conversation's turns, read here: a chip or a question
       *  still sends into it, but what its run is doing shows on its own
       *  page alone. */
      thread: Omit<ComponentProps<typeof ChatThread>, "progress">
    }

type PaneMaterial<Kind extends ChatPaneMaterial["kind"]> = Extract<
  ChatPaneMaterial,
  { kind: Kind }
>

/** The view a material's page mounts, in the pane instead: the job's
 *  overview, the table's grid over its row count, the store's value, the
 *  file's body, the run's row held open, the folder's listing, the other
 *  chat's turns. A file here has no neighbors, so no arrow keys; a store's
 *  or a file's own menu hangs off the name in the pane's header. */
export function ChatPaneBody({ material }: { material: ChatPaneMaterial }) {
  switch (material.kind) {
    case "job":
      return (
        <ConsolePageLayout>
          <JobDetail {...material.detail} />
        </ConsolePageLayout>
      )
    case "table":
      return <TableBody {...material} />
    case "store":
      return <StoreBody {...material} />
    case "file":
      return <FileBody {...material} />
    case "run":
      return <RunBody {...material} />
    case "folder":
      return (
        <ConsoleListLayout>
          <FolderContents {...material.contents} />
          {material.overlays}
        </ConsoleListLayout>
      )
    case "chat":
      return <ChatThread {...material.thread} />
  }
}

function TableBody({ grid, overlays, rowCount }: PaneMaterial<"table">) {
  return (
    <ConsoleListLayout>
      <RowGrid {...grid} />
      <ConsoleListFooter>
        <p className="text-muted-foreground text-xs">
          {countLabel(rowCount, "row")}
        </p>
      </ConsoleListFooter>
      {overlays}
    </ConsoleListLayout>
  )
}

function StoreBody({
  onWriteSchema,
  onWriteValue,
  store,
}: PaneMaterial<"store">) {
  return (
    <ConsoleListLayout>
      <Suspense fallback={<ConsoleListLoading />}>
        <StoreValue
          onWriteSchema={onWriteSchema}
          onWriteValue={onWriteValue}
          store={store}
          titleMenu={leadMenu}
        />
      </Suspense>
    </ConsoleListLayout>
  )
}

function FileBody({ file, onSave }: PaneMaterial<"file">) {
  return (
    <ConsoleListLayout>
      <Suspense fallback={<ConsoleListLoading />}>
        <FileViewer
          file={file}
          onSave={onSave}
          siblings={noSiblings}
          titleMenu={leadMenu}
        />
      </Suspense>
    </ConsoleListLayout>
  )
}

/** The run as the Activity page lists it, opened to its detail and kept
 *  that way: one run on its own needs no control to close it. */
function RunBody({ execution, now, slots }: PaneMaterial<"run">) {
  return (
    <ConsolePageLayout>
      <ExecutionRow
        {...slots}
        execution={execution}
        now={now}
        open
        showAudience={false}
      />
    </ConsolePageLayout>
  )
}

/** The menu on the name in the pane's header: the view's own items, and
 *  nothing more — everything else about the material is a page away. */
function leadMenu(lead: ReactNode) {
  return (
    <DropdownMenuContent align="start" className={menuWidth}>
      {lead}
    </DropdownMenuContent>
  )
}
