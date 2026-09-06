import { type ComponentProps, lazy, type ReactNode, Suspense } from "react"
import { DropdownMenuContent } from "@/components/ui/dropdown-menu"
import { countLabel } from "../../count"
import { type FileSave } from "../../files/editor/section"
import { noSiblings } from "../../files/siblings"
import { type FileDetail } from "../../files/types"
import { JobDetail, type JobDetailProps } from "../../jobs/detail"
import { ConsolePageLayout } from "../../layout"
import { ConsoleListFooter, ConsoleListLayout } from "../../list/frame"
import { ConsoleListLoading } from "../../list/loading"
import { menuWidth } from "../../menu"
import { type SchemaWrite } from "../../stores/schema/dialog"
import { type StoreDetail } from "../../stores/types"
import { type ValueWrite } from "../../stores/value/editor"
import { RowGrid } from "../../tables/grid"

// The store's editor and the file's viewer carry CodeMirror and the schema
// builder; they arrive only once a tab holds one, so the chat's own chunk
// stays light.
const StoreValue = lazy(() =>
  import("../../stores/value/section").then((module) => ({
    default: module.StoreValue,
  }))
)
const FileBody = lazy(() =>
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

/** The view a material's page mounts, in the pane instead: the job's
 *  overview, the table's grid over its row count, the store's value, the
 *  file's body. A file here has no neighbors, so no arrow keys; a store's
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
      return (
        <ConsoleListLayout>
          <RowGrid {...material.grid} />
          <ConsoleListFooter>
            <p className="text-muted-foreground text-xs">
              {countLabel(material.rowCount, "row")}
            </p>
          </ConsoleListFooter>
          {material.overlays}
        </ConsoleListLayout>
      )
    case "store":
      return (
        <ConsoleListLayout>
          <Suspense fallback={<ConsoleListLoading />}>
            <StoreValue
              onWriteSchema={material.onWriteSchema}
              onWriteValue={material.onWriteValue}
              store={material.store}
              titleMenu={leadMenu}
            />
          </Suspense>
        </ConsoleListLayout>
      )
    case "file":
      return (
        <ConsoleListLayout>
          <Suspense fallback={<ConsoleListLoading />}>
            <FileBody
              file={material.file}
              onSave={material.onSave}
              siblings={noSiblings}
              titleMenu={leadMenu}
            />
          </Suspense>
        </ConsoleListLayout>
      )
  }
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
