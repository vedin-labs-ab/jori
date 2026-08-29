import { Folder } from "lucide-react"
import { type ReactNode } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ConsoleEmptyState } from "../../shared/list/empty"
import { ConsoleListContent } from "../../shared/list/frame"
import { ConsoleListLoading } from "../../shared/list/loading"
import { type FolderContentsResult, type FolderResource } from "../types"
import { ResourceListRow } from "./resource"
import { FolderListRow, FolderListTable } from "./table"

/** A folder's listing: subfolders first, then the filed resources in one
 *  name-sorted run, in the shared full-bleed table. The states that replace
 *  the table sit in the padded content region instead. */
export function FolderContents({
  contents,
  folderId,
  newMenu,
  onMove,
  onUnfile,
}: {
  contents: FolderContentsResult | undefined
  /** The folder being viewed — the one filed resources already sit in. */
  folderId: string
  /** The header's "New" menu again, as the empty state's call to action. */
  newMenu: ReactNode
  onMove: (resource: FolderResource) => void
  onUnfile: (resource: FolderResource) => void
}) {
  if (contents === undefined) {
    return (
      <ConsoleListContent>
        <ConsoleListLoading />
      </ConsoleListContent>
    )
  }

  if (contents.status !== "ready") {
    return (
      <ConsoleListContent>
        <Alert variant="destructive">
          <AlertTitle>Could not load the folder</AlertTitle>
          <AlertDescription>
            {contents.status === "unauthorized"
              ? contents.message
              : "The folder may have been deleted."}
          </AlertDescription>
        </Alert>
      </ConsoleListContent>
    )
  }

  if (contents.folders.length === 0 && contents.resources.length === 0) {
    return (
      <ConsoleListContent>
        <ConsoleEmptyState
          action={newMenu}
          description="File tables, stores, files, and automations here, or add a subfolder."
          icon={Folder}
          title="Empty folder"
        />
      </ConsoleListContent>
    )
  }

  return (
    <FolderListTable>
      {contents.folders.map((folder) => (
        <FolderListRow folder={folder} key={folder.folderId} />
      ))}
      {contents.resources.map((resource) => (
        <ResourceListRow
          folderId={folderId}
          key={resource.id}
          onMove={onMove}
          onUnfile={onUnfile}
          resource={resource}
        />
      ))}
    </FolderListTable>
  )
}
