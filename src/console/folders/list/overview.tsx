import { useQuery } from "convex/react"
import { Folder, Plus } from "lucide-react"
import { useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { api } from "../../../../convex/_generated/api"
import { ConsolePage } from "../../page"
import { ConsoleHeaderActions, ConsoleHeaderButton } from "../../shared/layout"
import { ConsoleEmptyState } from "../../shared/list/empty"
import { ConsoleListContent, ConsoleListLayout } from "../../shared/list/frame"
import { ConsoleListSkeleton } from "../../shared/list/skeleton"
import { type FolderDialogRequest, FolderDialogs } from "../manage"
import { type FolderTreeResult } from "../types"
import { FolderListRow, FolderListTable } from "./table"

/** The folder tree's landing page: the root folders in the same full-bleed
 *  table a folder's own page uses. The icon-collapsed sidebar links here —
 *  with the tree hidden, navigation continues in the main view. */
export function FoldersOverview() {
  return (
    <ConsolePage>
      {(organizationId) => <RootFolders organizationId={organizationId} />}
    </ConsolePage>
  )
}

function RootFolders({ organizationId }: { organizationId: string }) {
  const tree = useQuery(api.folders.console.tree, { organizationId })
  const [dialog, setDialog] = useState<FolderDialogRequest>()
  const create = () => setDialog({ type: "create" })

  return (
    <ConsoleListLayout>
      <ConsoleHeaderActions>
        <ConsoleHeaderButton
          icon={<Plus />}
          label="New folder"
          onClick={create}
          type="button"
        />
      </ConsoleHeaderActions>
      <RootFolderList onCreate={create} tree={tree} />
      <FolderDialogs
        dialog={dialog}
        onClose={() => setDialog(undefined)}
        // Only the create dialog is reachable from this page, so a deletion
        // can never need navigation away.
        onDeleted={() => undefined}
        organizationId={organizationId}
      />
    </ConsoleListLayout>
  )
}

export function RootFolderList({
  onCreate,
  tree,
}: {
  onCreate: () => void
  tree: FolderTreeResult | undefined
}) {
  if (tree === undefined) {
    return (
      <ConsoleListContent>
        <ConsoleListSkeleton />
      </ConsoleListContent>
    )
  }

  if (tree.status !== "ready") {
    return (
      <ConsoleListContent>
        <Alert variant="destructive">
          <AlertTitle>Could not load folders</AlertTitle>
          <AlertDescription>{tree.message}</AlertDescription>
        </Alert>
      </ConsoleListContent>
    )
  }

  const roots = tree.folders.filter((folder) => folder.parentId === undefined)

  if (roots.length === 0) {
    return (
      <ConsoleListContent>
        <ConsoleEmptyState
          action={
            <Button onClick={onCreate} type="button">
              <Plus />
              New folder
            </Button>
          }
          description="Folders organize the tables, stores, files, and automations your team shares."
          icon={Folder}
          title="No folders yet"
        />
      </ConsoleListContent>
    )
  }

  return (
    <FolderListTable>
      {roots.map((folder) => (
        <FolderListRow folder={folder} key={folder.folderId} />
      ))}
    </FolderListTable>
  )
}
