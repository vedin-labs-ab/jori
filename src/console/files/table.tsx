import { Files, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatFileSize } from "@/lib/size"
import { SelectionHeadCell, SelectionRowCell } from "../shared/list/bar"
import {
  facetEntries,
  type ListConfig,
  type ListControls,
} from "../shared/list/controls"
import { EmptyRow, FilterableEmptyState } from "../shared/list/empty"
import { ConsoleListContent, ConsoleListTable } from "../shared/list/frame"
import { FilterHead, SortHead } from "../shared/list/head"
import { ConsoleListLoading } from "../shared/list/loading"
import { type RowSelection } from "../shared/list/selection"
import { MaterialFolderCell } from "../shared/materials/cells/folder"
import { type FolderNames } from "../shared/materials/folders"
import { absoluteTime, relativeTime, useNow } from "../shared/time"
import { FileNameCell, FileOwnerCell, FileTypeCell } from "./cells"
import { FileMenu } from "./menu"
import { type FileRow } from "./types"

export function FileTable({
  config,
  controls,
  files,
  folders,
  hasFilters,
  isLoading,
  onAccess,
  onDelete,
  onEdit,
  onMoveToFolder,
  onUpload,
  pendingFileId,
  selection,
}: {
  config: ListConfig<FileRow>
  controls: ListControls
  files: FileRow[]
  folders: FolderNames | undefined
  hasFilters: boolean
  isLoading: boolean
  onAccess: (file: FileRow) => void
  onDelete: (file: FileRow) => void
  onEdit: (file: FileRow) => void
  onMoveToFolder: (file: FileRow) => void
  onUpload: () => void
  pendingFileId: FileRow["fileId"] | undefined
  selection: RowSelection<FileRow>
}) {
  if (isLoading) {
    return <ConsoleListLoading />
  }

  if (files.length === 0 && !hasFilters) {
    return (
      <ConsoleListContent>
        <FilesEmptyState hasFilters={false} onUpload={onUpload} />
      </ConsoleListContent>
    )
  }

  return (
    <ConsoleListTable>
      <FileTableHead
        config={config}
        controls={controls}
        selection={selection}
      />
      <TableBody>
        {files.length === 0 ? (
          <EmptyRow colSpan={9}>
            <FilesEmptyState hasFilters onUpload={onUpload} />
          </EmptyRow>
        ) : (
          files.map((file) => (
            <FileTableRow
              file={file}
              folders={folders}
              isPending={pendingFileId === file.fileId}
              key={file.fileId}
              onAccess={onAccess}
              onDelete={onDelete}
              onEdit={onEdit}
              onMoveToFolder={onMoveToFolder}
              selection={selection}
            />
          ))
        )}
      </TableBody>
    </ConsoleListTable>
  )
}

/** The header row is the page's control surface: the kind facet rides the
 *  Type column, folders their own, and the measured columns sort. */
function FileTableHead({
  config,
  controls,
  selection,
}: {
  config: ListConfig<FileRow>
  controls: ListControls
  selection: RowSelection<FileRow>
}) {
  return (
    <TableHeader>
      <TableRow>
        <SelectionHeadCell selection={selection} />
        <SortHead controls={controls} label="Name" sortKey="name" />
        <SortHead controls={controls} label="Size" sortKey="size" />
        <FilterHead
          controls={controls}
          facets={facetEntries(config, ["kind"])}
          label="Type"
        />
        <FilterHead
          controls={controls}
          facets={facetEntries(config, ["folder"])}
          label="Folder"
        />
        <SortHead controls={controls} label="Created" sortKey="created" />
        <FilterHead
          controls={controls}
          facets={facetEntries(config, ["owner"])}
          label="Owner"
        />
        <SortHead controls={controls} label="Last Updated" sortKey="updated" />
        <TableHead className="w-10" />
      </TableRow>
    </TableHeader>
  )
}

function FilesEmptyState({
  hasFilters,
  onUpload,
}: {
  hasFilters: boolean
  onUpload: () => void
}) {
  return (
    <FilterableEmptyState
      action={
        <Button onClick={onUpload} type="button">
          <Upload />
          Upload file
        </Button>
      }
      description="Files Jori saves during runs and uploads from your team appear here."
      hasFilters={hasFilters}
      icon={Files}
      noun="files"
    />
  )
}

function FileTableRow({
  file,
  folders,
  isPending,
  onAccess,
  onDelete,
  onEdit,
  onMoveToFolder,
  selection,
}: {
  file: FileRow
  folders: FolderNames | undefined
  isPending: boolean
  onAccess: (file: FileRow) => void
  onDelete: (file: FileRow) => void
  onEdit: (file: FileRow) => void
  onMoveToFolder: (file: FileRow) => void
  selection: RowSelection<FileRow>
}) {
  const now = useNow(30_000)

  return (
    <TableRow data-state={selection.isSelected(file) ? "selected" : undefined}>
      <SelectionRowCell
        label={`Select ${file.name}`}
        row={file}
        selection={selection}
      />
      <TableCell>
        <FileNameCell file={file} />
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatFileSize(file.size)}
      </TableCell>
      <TableCell>
        <FileTypeCell file={file} />
      </TableCell>
      <TableCell>
        <MaterialFolderCell folderId={file.folderId} folders={folders} />
      </TableCell>
      <TableCell
        className="text-muted-foreground"
        title={absoluteTime(file.createdAt)}
      >
        {relativeTime(file.createdAt, now)}
      </TableCell>
      <TableCell>
        <FileOwnerCell file={file} />
      </TableCell>
      <TableCell
        className="text-muted-foreground"
        title={absoluteTime(file.updatedAt)}
      >
        {relativeTime(file.updatedAt, now)}
      </TableCell>
      <TableCell className="text-right">
        <FileMenu
          file={file}
          isPending={isPending}
          onAccess={onAccess}
          onDelete={onDelete}
          onEdit={onEdit}
          onMoveToFolder={onMoveToFolder}
        />
      </TableCell>
    </TableRow>
  )
}
