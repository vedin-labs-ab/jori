import { Copy, Download, ExternalLink, Trash2 } from "lucide-react"
import { useState } from "react"
import { AlertDialog } from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { copyText } from "@/shared/console/copy/text"
import { MaterialCoreItems } from "@/shared/console/materials/actions"
import { MenuProvenance } from "@/shared/console/materials/actions/note"
import { fileOwner } from "@/shared/console/materials/owners"
import { menuWidth, RowMenuTrigger } from "@/shared/console/menu"
import { formatFileSize } from "@/shared/files/size"
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
 *  it. `view` is absent for every file but HTML, which leaves the group
 *  out rather than offering a choice of one. */
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
      <DropdownMenuSeparator />
      {view === undefined || onViewChange === undefined ? null : (
        <>
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
          <DropdownMenuSeparator />
        </>
      )}
      {copy === undefined ? null : (
        <>
          <DropdownMenuItem
            onSelect={() => void copyText(() => readFileText(file, copy))}
          >
            <Copy />
            Copy text
          </DropdownMenuItem>
          <DropdownMenuSeparator />
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
      <DropdownMenuItem
        disabled={isPending}
        onSelect={onRemove}
        variant="destructive"
      >
        <Trash2 />
        Delete
      </DropdownMenuItem>
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
      <DropdownMenu>
        <RowMenuTrigger name={file.name} />
        <DropdownMenuContent align="end" className={menuWidth}>
          <FileMenuItems
            file={file}
            isPending={isPending}
            onAccess={() => onAccess(file)}
            onEdit={() => onEdit(file)}
            onMoveToFolder={() => onMoveToFolder(file)}
            onRemove={() => setIsDeleteOpen(true)}
            withLinks
          />
        </DropdownMenuContent>
      </DropdownMenu>
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
      <DropdownMenuItem asChild>
        <a href={file.url} rel="noreferrer" target="_blank">
          <ExternalLink />
          Open
        </a>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <a download={file.name} href={file.url} rel="noreferrer">
          <Download />
          Download
        </a>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
    </>
  )
}
