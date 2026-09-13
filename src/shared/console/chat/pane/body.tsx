import { type ComponentProps, lazy, type ReactNode, Suspense } from "react"
import { DropdownMenuContent } from "@/components/ui/dropdown-menu"
import { countLabel } from "../../count"
import { type FileSave } from "../../files/editor/section"
import { noSiblings } from "../../files/siblings"
import { type FileDetail } from "../../files/types"
import { type FolderContents } from "../../folders/list/contents"
import { type JobDetailProps } from "../../jobs/detail"
import { ConsolePageLayout } from "../../layout"
import { ConsoleListFooter, ConsoleListLayout } from "../../list/frame"
import { ConsoleListLoading } from "../../list/loading"
import { menuWidth } from "../../menu"
import { type RunRowSlots } from "../../runs/row"
import { type ExecutionItem } from "../../runs/types"
import { type SchemaWrite } from "../../stores/schema/dialog"
import { type StoreDetail } from "../../stores/types"
import { type ValueWrite } from "../../stores/value/editor"
import { type RowGrid } from "../../tables/grid"
import { ChatThread } from "../thread"

// Each material's view arrives with the first tab that holds one, so the
// chat's own chunk carries none of them: the job's overview with the
// brief's codec, the table's grid, the folder's listing, the run's row,
// and the store's and the file's editors with CodeMirror and the schema
// builder. Another chat's turns are the thread this page already renders.
const JobOverview = lazy(async () => ({
  default: (await import("../../jobs/detail")).JobDetail,
}))
const TableGrid = lazy(async () => ({
  default: (await import("../../tables/grid")).RowGrid,
}))
const StoreValue = lazy(async () => ({
  default: (await import("../../stores/value/section")).StoreValue,
}))
const FileViewer = lazy(async () => ({
  default: (await import("../../files/body")).FileBody,
}))
const RunRow = lazy(async () => ({
  default: (await import("../../runs/row")).ExecutionRow,
}))
const FolderListing = lazy(async () => ({
  default: (await import("../../folders/list/contents")).FolderContents,
}))

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
      audience?: ReactNode
      kind: "store"
      onWriteSchema: SchemaWrite
      onWriteValue: ValueWrite
      store: StoreDetail
    }
  | { kind: "file"; file: FileDetail; onSave: FileSave; audience?: ReactNode }
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
          <Arriving>
            <JobOverview {...material.detail} />
          </Arriving>
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
          <Arriving>
            <FolderListing {...material.contents} />
          </Arriving>
          {material.overlays}
        </ConsoleListLayout>
      )
    case "chat":
      return <ChatThread {...material.thread} />
  }
}

/** The list's loading state while a view's chunk is on its way. */
function Arriving({ children }: { children: ReactNode }) {
  return <Suspense fallback={<ConsoleListLoading />}>{children}</Suspense>
}

function TableBody({ grid, overlays, rowCount }: PaneMaterial<"table">) {
  return (
    <ConsoleListLayout>
      <Arriving>
        <TableGrid {...grid} />
      </Arriving>
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
  audience,
  onWriteSchema,
  onWriteValue,
  store,
}: PaneMaterial<"store">) {
  return (
    <ConsoleListLayout>
      <Arriving>
        <StoreValue
          audience={audience}
          onWriteSchema={onWriteSchema}
          onWriteValue={onWriteValue}
          store={store}
          titleMenu={leadMenu}
        />
      </Arriving>
    </ConsoleListLayout>
  )
}

function FileBody({ file, onSave, audience }: PaneMaterial<"file">) {
  return (
    <ConsoleListLayout>
      <Arriving>
        <FileViewer
          audience={audience}
          file={file}
          onSave={onSave}
          siblings={noSiblings}
          titleMenu={leadMenu}
        />
      </Arriving>
    </ConsoleListLayout>
  )
}

/** The run as the Activity page lists it, opened to its detail and kept
 *  that way: one run on its own needs no control to close it. */
function RunBody({ execution, now, slots }: PaneMaterial<"run">) {
  return (
    <ConsolePageLayout>
      <Arriving>
        <RunRow
          {...slots}
          execution={execution}
          now={now}
          open
          showAudience={false}
        />
      </Arriving>
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
