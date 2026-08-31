import { useQuery } from "convex/react"
import { Folder, Plus } from "lucide-react"
import { useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { api } from "../../../../convex/_generated/api"
import { ConsolePage } from "../../page"
import { ConsoleHeaderActions, ConsoleHeaderButton } from "../../shared/layout"
import {
  ConsoleEmptyState,
  EmptyRow,
  FilterableEmptyState,
} from "../../shared/list/empty"
import { ConsoleListContent, ConsoleListLayout } from "../../shared/list/frame"
import { ConsoleListLoading } from "../../shared/list/loading"
import { useMaterialTrail } from "../../shared/materials/breadcrumb"
import { FoldersTitleMenu } from "../header"
import { type FolderDialogRequest, FolderDialogs } from "../manage"
import { type FolderRootsResult } from "../types"
import { useFolderListControls } from "./controls"
import { FolderListRow, FolderListTable } from "./table"

// The tree's root is not a folder, so its crumb is a constant: the surface
// name, with the one thing the whole tree can be asked about.
const foldersCrumb = { menu: <FoldersTitleMenu />, name: "Folders" }

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
  const roots = useQuery(api.folders.console.roots, { organizationId })
  const [dialog, setDialog] = useState<FolderDialogRequest>()
  const create = () => setDialog({ type: "create" })

  useMaterialTrail(foldersCrumb)

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
      <RootFolderList onCreate={create} roots={roots} />
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
  roots,
}: {
  onCreate: () => void
  roots: FolderRootsResult | undefined
}) {
  const list = useFolderListControls([])

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
          description="Folders organize the tables, stores, files, and automations your team shares."
          icon={Folder}
          title="No folders yet"
        />
      </ConsoleListContent>
    )
  }

  const visible = list.narrow(roots.folders)

  return (
    <FolderListTable controls={list.controls} kinds={list.kinds}>
      {visible.length === 0 ? (
        <EmptyRow colSpan={5}>
          <FilterableEmptyState
            description="Folders organize the tables, stores, files, and automations your team shares."
            hasFilters
            icon={Folder}
            noun="folders"
          />
        </EmptyRow>
      ) : (
        visible.map((folder) => (
          <FolderListRow folder={folder} key={folder.folderId} />
        ))
      )}
    </FolderListTable>
  )
}
