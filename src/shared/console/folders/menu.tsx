import { ChartNoAxesColumn, Pencil, Trash2 } from "lucide-react"
import { useEditing, useEditMenuFocus } from "../edit/state"
import { MaterialFilingItems } from "../materials/actions"
import { materialOwner } from "../materials/owners"
import { TitleMenuContent } from "../menu"
import { MenuItem, MenuSeparator } from "../menu/items"
import { MenuProvenance } from "../menu/provenance"
import { RowMenu } from "../menu/row"
import { ConsoleLink } from "../shell/link"
import {
  type FolderDetail,
  type FolderDialogRequest,
  type ManagedFolder,
} from "./types"

// The canonical menu for a folder, as items only: what it costs, what it
// is, and what removes it. The breadcrumb, the sidebar tree row, and a
// folder listing's row all compose exactly this inside their own trigger.

/** The way to what a folder has spent, or the whole tree with no folder
 *  named. */
export function FolderUsageItem({ folderId }: { folderId?: string }) {
  return (
    <MenuItem asChild>
      {folderId === undefined ? (
        <ConsoleLink to="/folders/usage">
          <ChartNoAxesColumn />
          Usage
        </ConsoleLink>
      ) : (
        <ConsoleLink params={{ folderId }} to="/folders/$folderId/usage">
          <ChartNoAxesColumn />
          Usage
        </ConsoleLink>
      )}
    </MenuItem>
  )
}

export function FolderMenuItems({
  folder,
  onDialog,
}: {
  folder: ManagedFolder
  onDialog: (request: FolderDialogRequest) => void
}) {
  return (
    <>
      <FolderUsageItem folderId={folder.folderId} />
      <MenuSeparator />
      <MenuItem onSelect={() => onDialog({ type: "rename", folder })}>
        <Pencil />
        Rename
      </MenuItem>
      <MaterialFilingItems
        onAccess={() => onDialog({ type: "access", folder })}
        onMoveToFolder={() => onDialog({ type: "move", folder })}
      />
      <MenuSeparator />
      <MenuItem
        onSelect={() => onDialog({ type: "delete", folder })}
        variant="destructive"
      >
        <Trash2 />
        Delete
      </MenuItem>
    </>
  )
}

/** The folder's menu, opened from its name in the breadcrumb. */
export function FolderTitleMenu({
  folder,
  onDialog,
}: {
  folder: FolderDetail
  onDialog: (request: FolderDialogRequest) => void
}) {
  const editing = useEditing()
  const onCloseAutoFocus = useEditMenuFocus()
  return (
    <TitleMenuContent
      lead={
        <MenuProvenance
          owner={materialOwner(folder)}
          updatedAt={folder.updatedAt}
        />
      }
      onCloseAutoFocus={onCloseAutoFocus}
    >
      <FolderMenuItems
        folder={folder}
        onDialog={(request) =>
          request.type === "rename"
            ? editing?.begin(
                {
                  id: folder.folderId,
                  kind: "folder",
                  name: folder.name,
                  parentId: folder.parentId,
                },
                "title"
              )
            : onDialog(request)
        }
      />
    </TitleMenuContent>
  )
}

/** The same menu on a folder listing's row, trigger and all. */
export function FolderRowMenu({
  folder,
  onDialog,
}: {
  folder: ManagedFolder
  onDialog: (request: FolderDialogRequest) => void
}) {
  return (
    <RowMenu name={folder.name}>
      <FolderMenuItems folder={folder} onDialog={onDialog} />
    </RowMenu>
  )
}

/** The overview's menu. Nothing there is a folder, so the tree's own spend
 *  is all its name has to offer. */
export function FoldersTitleMenu() {
  return (
    <TitleMenuContent>
      <FolderUsageItem />
    </TitleMenuContent>
  )
}
