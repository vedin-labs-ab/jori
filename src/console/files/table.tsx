import { Files, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SelectionHeadCell, SelectionRowCell } from "../shared/list/bar"
import { ConsoleEmptyState } from "../shared/list/empty"
import { ConsoleListContent, ConsoleListTable } from "../shared/list/frame"
import { ConsoleListLoading } from "../shared/list/loading"
import { type RowSelection } from "../shared/list/selection"
import { MaterialFolderCell } from "../shared/materials/cells/folder"
import { type FolderNames } from "../shared/materials/folders"
import { absoluteTime, relativeTime, useNow } from "../shared/time"
import { FileNameCell, FileOwnerCell, FileTypeCell } from "./cells"
import { FileMenu } from "./menu"
import { type FileRow, formatFileSize } from "./types"

export function FileTable({
  files,
  folders,
  isLoading,
  onDelete,
  onEdit,
  onMoveToFolder,
  onUpload,
  pendingFileId,
  selection,
}: {
  files: FileRow[]
  folders: FolderNames | undefined
  isLoading: boolean
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

  if (files.length === 0) {
    return (
      <ConsoleListContent>
        <ConsoleEmptyState
          action={
            <Button onClick={onUpload} type="button">
              <Upload />
              Upload file
            </Button>
          }
          description="Files Jori saves during runs and uploads from your team appear here."
          icon={Files}
          title="No files yet"
        />
      </ConsoleListContent>
    )
  }

  return (
    <ConsoleListTable>
      <FileTableHead selection={selection} />
      <TableBody>
        {files.map((file) => (
          <FileTableRow
            file={file}
            folders={folders}
            isPending={pendingFileId === file.fileId}
            key={file.fileId}
            onDelete={onDelete}
            onEdit={onEdit}
            onMoveToFolder={onMoveToFolder}
            selection={selection}
          />
        ))}
      </TableBody>
    </ConsoleListTable>
  )
}

function FileTableHead({ selection }: { selection: RowSelection<FileRow> }) {
  return (
    <TableHeader>
      <TableRow>
        <SelectionHeadCell selection={selection} />
        <TableHead>Name</TableHead>
        <TableHead>Size</TableHead>
        <TableHead>Type</TableHead>
        <TableHead>Folder</TableHead>
        <TableHead>Created</TableHead>
        <TableHead>Owner</TableHead>
        <TableHead>Last Updated</TableHead>
        <TableHead className="w-10" />
      </TableRow>
    </TableHeader>
  )
}

function FileTableRow({
  file,
  folders,
  isPending,
  onDelete,
  onEdit,
  onMoveToFolder,
  selection,
}: {
  file: FileRow
  folders: FolderNames | undefined
  isPending: boolean
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
          onDelete={onDelete}
          onEdit={onEdit}
          onMoveToFolder={onMoveToFolder}
        />
      </TableCell>
    </TableRow>
  )
}
