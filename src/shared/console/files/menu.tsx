import { Copy, Download, ExternalLink, Trash2 } from "lucide-react"
import { type ReactNode, useState } from "react"
import { AlertDialog } from "@/components/ui/alert-dialog"
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { copyText } from "@/shared/console/copy/text"
import { MaterialCoreItems } from "@/shared/console/materials/actions"
import { fileOwner } from "@/shared/console/materials/owners"
import { TitleMenuContent } from "@/shared/console/menu"
import { MenuItem, MenuSeparator } from "@/shared/console/menu/items"
import { MenuProvenance } from "@/shared/console/menu/provenance"
import { RowMenu } from "@/shared/console/menu/row"
import { downloadUrl } from "@/shared/files/download"
import { formatFileSize } from "@/shared/files/size"
import { showErrorToast } from "../error"
import { fileBlobCache } from "./cache/blob"
import { DeleteFileDialog } from "./delete"
import { type FileRow } from "./types"
import { type HtmlMode } from "./viewer/html"

// The canonical menu for a file, as items only. The list row and a folder
// listing's row lead with the links to the file itself; the detail page
// leaves them out, because its header already carries the same two, and
// leads instead with the file: its provenance and the view's own tools.

/** Where a text-backed view's text is read from when it is copied: the
 *  editor's saved buffer when the view has one, else the stored blob
 *  through the cache the view already warmed. */
export type FileCopySource = {
  savedText?: string
  url: string
}

/** The file's own lines for its title menu: provenance, the way an HTML
 *  file is shown, and a copy of the text — each only where the view has
 *  it, and a divider only between two of them; whatever a host sets
 *  after them brings its own. `view` is absent for every file but HTML,
 *  which leaves the group out rather than offering a choice of one. */
export function FileLead({
  copy,
  file,
  onViewChange,
  view,
}: {
  copy?: FileCopySource
  file: FileRow
  onViewChange?: (view: HtmlMode) => void
  view?: HtmlMode
}) {
  return (
    <>
      <MenuProvenance
        detail={formatFileSize(file.size)}
        owner={fileOwner(file)}
        updatedAt={file.updatedAt}
      />
      {view === undefined || onViewChange === undefined ? null : (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>View</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            onValueChange={(next) => onViewChange(next as HtmlMode)}
            value={view}
          >
            <DropdownMenuRadioItem value="preview">
              Preview
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="code">Code</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </>
      )}
      {copy === undefined ? null : (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => void copyText(() => readFileText(file, copy))}
          >
            <Copy />
            Copy text
          </DropdownMenuItem>
        </>
      )}
    </>
  )
}

async function readFileText(file: FileRow, copy: FileCopySource) {
  if (copy.savedText !== undefined) {
    return copy.savedText
  }

  const cached = await fileBlobCache.load({
    fileId: file.fileId,
    size: file.size,
    updatedAt: file.updatedAt,
    url: copy.url,
  })

  return await cached.blob.text()
}

export function FileMenuItems({
  file,
  isPending,
  onAccess,
  onEdit,
  onMoveToFolder,
  onRemove,
  onUnfile,
  withLinks,
}: {
  file: { name: string; url: string | null }
  isPending: boolean
  onAccess: () => void
  onEdit: () => void
  onMoveToFolder: () => void
  onRemove: () => void
  /** Folder listings only: unfiling acts on the filing, not on the file. */
  onUnfile?: () => void
  /** Whether to lead with Open and Download. */
  withLinks: boolean
}) {
  return (
    <>
      {withLinks ? <FileLinkItems file={file} /> : null}
      <MaterialCoreItems
        isPending={isPending}
        onAccess={onAccess}
        onEdit={onEdit}
        onMoveToFolder={onMoveToFolder}
        onUnfile={onUnfile}
      />
      <MenuItem disabled={isPending} onSelect={onRemove} variant="destructive">
        <Trash2 />
        Delete
      </MenuItem>
    </>
  )
}

/** The file's menu on its own list row, trigger and confirmation included. */
export function FileRowMenu({
  file,
  isPending,
  onAccess,
  onDelete,
  onEdit,
  onMoveToFolder,
}: {
  file: FileRow
  isPending: boolean
  onAccess: (file: FileRow) => void
  onDelete: (file: FileRow) => void
  onEdit: (file: FileRow) => void
  onMoveToFolder: (file: FileRow) => void
}) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  return (
    <AlertDialog onOpenChange={setIsDeleteOpen} open={isDeleteOpen}>
      <RowMenu name={file.name}>
        <FileMenuItems
          file={file}
          isPending={isPending}
          onAccess={() => onAccess(file)}
          onEdit={() => onEdit(file)}
          onMoveToFolder={() => onMoveToFolder(file)}
          onRemove={() => setIsDeleteOpen(true)}
          withLinks
        />
      </RowMenu>
      <DeleteFileDialog
        file={file}
        isPending={isPending}
        onDelete={() => onDelete(file)}
      />
    </AlertDialog>
  )
}

function FileLinkItems({
  file,
}: {
  file: { name: string; url: string | null }
}) {
  if (file.url === null) {
    return null
  }

  return (
    <>
      <MenuItem asChild>
        <a href={file.url} rel="noreferrer" target="_blank">
          <ExternalLink />
          Open
        </a>
      </MenuItem>
      <MenuItem
        onSelect={() => {
          if (file.url !== null) {
            void downloadUrl(file.name, file.url).catch((error: unknown) =>
              showErrorToast(error, "Could not download the file.")
            )
          }
        }}
      >
        <Download />
        Download
      </MenuItem>
      <MenuSeparator />
    </>
  )
}

export type FileDialog = "access" | "edit" | "move"

/** The file's actions hung off its name in the breadcrumb — the shell owns
 *  that trigger and the view publishes the crumb, so this is only the
 *  menu's content, led by the view's own lines, and the confirmation the
 *  delete passes through. Open and Download are left out: the detail
 *  page's header already carries both. */
export function FileTitleMenu({
  file,
  isPending,
  lead,
  onDelete,
  onOpen,
}: {
  file: FileRow
  isPending: boolean
  lead: ReactNode
  onDelete: () => void
  /** Requests one of the actions handled by the page adapter. */
  onOpen: (dialog: FileDialog) => void
}) {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  return (
    <AlertDialog onOpenChange={setIsDeleteOpen} open={isDeleteOpen}>
      <TitleMenuContent lead={lead}>
        <FileMenuItems
          file={file}
          isPending={isPending}
          onAccess={() => onOpen("access")}
          onEdit={() => onOpen("edit")}
          onMoveToFolder={() => onOpen("move")}
          onRemove={() => setIsDeleteOpen(true)}
          withLinks={false}
        />
      </TitleMenuContent>
      <DeleteFileDialog file={file} isPending={isPending} onDelete={onDelete} />
    </AlertDialog>
  )
}
