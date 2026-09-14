import { useMemo } from "react"
import { NewInFolderButton } from "@/shared/console/folders/create"
import { useFolderRequests } from "@/shared/console/folders/edit/state"
import { FolderContents } from "@/shared/console/folders/list/contents"
import { FoldersTitleMenu } from "@/shared/console/folders/menu"
import { ConsoleHeaderActions } from "@/shared/console/layout"
import { ConsoleListLayout } from "@/shared/console/list/frame"
import { useMaterialTrail } from "@/shared/console/materials/breadcrumb"
import { ConsolePage } from "../../page"
import { FolderDialogs } from "../manage"
import { FolderUsageHint } from "../usage/hint"
import { useFolderContents } from "./contents"

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
  const [dialog, setDialog] = useFolderRequests("contents")
  const create = () => setDialog({ type: "create" })
  const listing = useFolderContents({
    folder: undefined,
    organizationId,
    onDialog: setDialog,
    onNewFolder: create,
  })

  // The tree's root is not a folder, so its crumb is the surface name, the
  // one thing the whole tree can be asked about, and what all of it costs.
  useMaterialTrail(
    useMemo(
      () => ({
        aside: <FolderUsageHint organizationId={organizationId} />,
        menu: <FoldersTitleMenu />,
        name: "Folders",
      }),
      [organizationId]
    )
  )

  return (
    <ConsoleListLayout>
      <ConsoleHeaderActions>
        <NewInFolderButton onCreate={listing.onCreate} onNewFolder={create} />
      </ConsoleHeaderActions>
      <FolderContents {...listing.contents} />
      <FolderDialogs
        dialog={dialog}
        onClose={() => setDialog(undefined)}
        // Root folders delete from their own rows here; the page they leave
        // behind is the listing itself, so nothing has to navigate away.
        onDeleted={() => undefined}
        organizationId={organizationId}
      />
      {listing.overlays}
    </ConsoleListLayout>
  )
}
