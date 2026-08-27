import { Files } from "lucide-react"
import { Badge } from "@/components/ui/badge"
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
import { FileMenu } from "./menu"
import { type FileRow, formatFileSize } from "./types"

export function FileTable({
  files,
  isLoading,
  onDelete,
  onEdit,
  pendingFileId,
}: {
  files: FileRow[]
  isLoading: boolean
  onDelete: (file: FileRow) => void
  onEdit: (file: FileRow) => void
  pendingFileId: FileRow["fileId"] | undefined
}) {
  if (isLoading) {
    return <ConsoleListSkeleton />
  }

  if (files.length === 0) {
    return (
      <ConsoleEmptyState
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
        <TableHead>Type</TableHead>
        <TableHead>Size</TableHead>
        <TableHead>Scope</TableHead>
        <TableHead>Source</TableHead>
        <TableHead>Added</TableHead>
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
        <p className="truncate font-medium" title={file.name}>
          {file.name}
        </p>
        {file.description === undefined ? null : (
          <p
            className="truncate text-muted-foreground"
            title={file.description}
          >
            {file.description}
          </p>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">{file.mimeType}</TableCell>
      <TableCell className="text-muted-foreground">
        {formatFileSize(file.size)}
      </TableCell>
      <TableCell>
        <Badge variant={file.scope === "personal" ? "outline" : "secondary"}>
          {file.scope === "personal" ? "Personal" : "Organization"}
        </Badge>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {file.source === "run" ? "Agent run" : "Uploaded"}
      </TableCell>
      <TableCell
        className="text-muted-foreground"
        title={absoluteTime(file.createdAt)}
      >
        {relativeTime(file.createdAt, now)}
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
