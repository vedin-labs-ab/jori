import { Files, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableFrame,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ConsoleEmptyState } from "../shared/list/empty"
import { ConsoleListSkeleton } from "../shared/list/skeleton"
import { absoluteTime, relativeTime, useNow } from "../shared/time"
import { FileNameCell, FileOwnerCell, FileTypeCell } from "./cells"
import { FileMenu } from "./menu"
import { type FileRow, formatFileSize } from "./types"

export function FileTable({
  files,
  isLoading,
  onDelete,
  onEdit,
  onUpload,
  pendingFileId,
}: {
  files: FileRow[]
  isLoading: boolean
  onDelete: (file: FileRow) => void
  onEdit: (file: FileRow) => void
  onUpload: () => void
  pendingFileId: FileRow["fileId"] | undefined
}) {
  if (isLoading) {
    return <ConsoleListSkeleton />
  }

  if (files.length === 0) {
    return (
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
    )
  }

  return (
    <TableFrame>
      <Table>
        <FileTableHead />
        <TableBody>
          {files.map((file) => (
            <FileTableRow
              file={file}
              isPending={pendingFileId === file.fileId}
              key={file.fileId}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          ))}
        </TableBody>
      </Table>
    </TableFrame>
  )
}

function FileTableHead() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>Name</TableHead>
        <TableHead>Size</TableHead>
        <TableHead>Type</TableHead>
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
  isPending,
  onDelete,
  onEdit,
}: {
  file: FileRow
  isPending: boolean
  onDelete: (file: FileRow) => void
  onEdit: (file: FileRow) => void
}) {
  const now = useNow(30_000)

  return (
    <TableRow>
      <TableCell className="max-w-64">
        <FileNameCell file={file} />
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatFileSize(file.size)}
      </TableCell>
      <TableCell>
        <FileTypeCell file={file} />
      </TableCell>
      <TableCell
        className="text-muted-foreground"
        title={absoluteTime(file.createdAt)}
      >
        {relativeTime(file.createdAt, now)}
      </TableCell>
      <TableCell className="max-w-48">
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
        />
      </TableCell>
    </TableRow>
  )
}
