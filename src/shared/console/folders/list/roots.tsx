import { Folder, Plus } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  ConsoleEmptyState,
  EmptyRow,
  FilterableEmptyState,
} from "../../list/empty"
import { ConsoleListContent } from "../../list/frame"
import { ConsoleListLoading } from "../../list/loading"
import { type FolderDialogRequest, type FolderRootsResult } from "../types"
import { useFolderListControls } from "./controls"
import { FolderListRow, FolderListTable } from "./table"

/** The root folders in the same full-bleed table a folder's own page uses,
 *  or what stands in for them: a spinner, the refusal, or the invitation
 *  to make the first one. */
export function RootFolderList({
  onCreate,
  onDialog,
  roots,
}: {
  onCreate: () => void
  onDialog: (request: FolderDialogRequest) => void
  roots: FolderRootsResult | undefined
}) {
  const list = useFolderListControls({
    folders: roots?.status === "ready" ? roots.folders : [],
    resources: [],
  })

  if (roots === undefined) {
    return (
      <ConsoleListContent>
        <ConsoleListLoading />
      </ConsoleListContent>
    )
  }

  if (roots.status !== "ready") {
    return (
      <ConsoleListContent>
        <Alert variant="destructive">
          <AlertTitle>Could not load folders</AlertTitle>
          <AlertDescription>{roots.message}</AlertDescription>
        </Alert>
      </ConsoleListContent>
    )
  }

  if (roots.folders.length === 0) {
    return (
      <ConsoleListContent>
        <ConsoleEmptyState
          action={
            <Button onClick={onCreate} type="button">
              <Plus />
              New folder
            </Button>
          }
          description="Folders organize the tables, stores, files, and jobs your team shares."
          icon={Folder}
          title="No folders yet"
        />
      </ConsoleListContent>
    )
  }

  const visible = list.narrow(roots.folders)

  return (
    <FolderListTable
      controls={list.controls}
      kinds={list.kinds}
      owners={list.owners}
    >
      {visible.length === 0 ? (
        <EmptyRow colSpan={6}>
          <FilterableEmptyState
            description="Folders organize the tables, stores, files, and jobs your team shares."
            hasFilters
            icon={Folder}
            noun="folders"
          />
        </EmptyRow>
      ) : (
        visible.map((folder) => (
          <FolderListRow
            folder={folder}
            key={folder.folderId}
            onDialog={onDialog}
          />
        ))
      )}
    </FolderListTable>
  )
}
