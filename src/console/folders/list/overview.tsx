import { useQuery } from "convex/react"
import { Plus } from "lucide-react"
import { useMemo, useState } from "react"
import { RootFolderList } from "@/shared/console/folders/list/roots"
import { FoldersTitleMenu } from "@/shared/console/folders/menu"
import { type FolderDialogRequest } from "@/shared/console/folders/types"
import {
  ConsoleHeaderActions,
  ConsoleHeaderButton,
} from "@/shared/console/layout"
import { ConsoleListLayout } from "@/shared/console/list/frame"
import { useMaterialTrail } from "@/shared/console/materials/breadcrumb"
import { api } from "../../../../convex/_generated/api"
import { ConsolePage } from "../../page"
import { FolderDialogs } from "../manage"
import { FolderUsageHint } from "../usage/hint"
import { useFolderSelectionActions } from "./select"

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
  const selection = useFolderSelectionActions(organizationId)

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
        <ConsoleHeaderButton
          icon={<Plus />}
          label="New folder"
          onClick={create}
          type="button"
        />
      </ConsoleHeaderActions>
      <RootFolderList
        onCreate={create}
        onDialog={setDialog}
        roots={roots}
        selectionActions={selection.actions}
      />
      <FolderDialogs
        dialog={dialog}
        onClose={() => setDialog(undefined)}
        // Root folders delete from their own rows here; the page they leave
        // behind is the listing itself, so nothing has to navigate away.
        onDeleted={() => undefined}
        organizationId={organizationId}
      />
      {selection.dialog}
    </ConsoleListLayout>
  )
}
