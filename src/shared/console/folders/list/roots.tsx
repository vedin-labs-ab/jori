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
import { PendingFolderRow } from "../edit/pending"
import { usePendingFolder } from "../edit/state"
import { type FolderDialogRequest, type FolderRootsResult } from "../types"
import { FolderSelectionBar } from "./bar"
import { selectionPayload, useFolderListing } from "./controls"
import { type FolderSelectionActions } from "./select"
import { FolderListRow, FolderListTable, folderTableColumns } from "./table"

/** The root folders in the same full-bleed table a folder's own page uses,
 *  with the selection's dock over it — or what stands in for them: a
 *  spinner, the refusal, or the invitation to make the first one. */
export function RootFolderList({
  onCreate,
  onDialog,
  roots,
  selectionActions,
}: {
  onCreate: () => void
  onDialog: (request: FolderDialogRequest) => void
  roots: FolderRootsResult | undefined
  selectionActions: FolderSelectionActions
}) {
  const pending = usePendingFolder(undefined, "contents")
  const list = useFolderListing({
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

  if (roots.folders.length === 0 && !pending) {
    return <EmptyRoots onCreate={onCreate} />
  }

  return (
    <>
      <FolderListTable
        controls={list.controls}
        kinds={list.kinds}
        owners={list.owners}
        selection={list.selection}
      >
        {pending ? (
          <PendingFolderRow name={pending.name} colSpan={folderTableColumns} />
        ) : null}
        {list.folders.length === 0 && !pending ? (
          <EmptyRow colSpan={folderTableColumns}>
            <FilterableEmptyState
              description="Folders organize your chats and the tables, stores, files, and jobs your team shares."
              hasFilters
              icon={Folder}
              noun="folders"
            />
          </EmptyRow>
        ) : (
          list.folders.map((folder) => (
            <FolderListRow
              folder={folder}
              key={folder.folderId}
              onDialog={onDialog}
              selected={selectionPayload(list.selection.selected, undefined)}
              selection={list.selection}
            />
          ))
        )}
      </FolderListTable>
      <FolderSelectionBar
        actions={selectionActions}
        folderId={undefined}
        selection={list.selection}
      />
    </>
  )
}

function EmptyRoots({ onCreate }: { onCreate: () => void }) {
  return (
    <ConsoleListContent>
      <ConsoleEmptyState
        action={
          <Button onClick={onCreate} type="button">
            <Plus />
            New folder
          </Button>
        }
        description="Folders organize your chats and the tables, stores, files, and jobs your team shares."
        icon={Folder}
        title="No folders yet"
      />
    </ConsoleListContent>
  )
}
