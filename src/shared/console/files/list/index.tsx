import { Files, Upload } from "lucide-react"
import { type ResourceDragItem } from "@/shared/console/folders/drag/plan"
import {
  type ListConfig,
  type ListControls,
} from "@/shared/console/list/controls"
import { ConsoleListLoading } from "@/shared/console/list/loading"
import { type RowSelection } from "@/shared/console/list/selection"
import { type SelectionActions } from "@/shared/console/list/selection/bar"
import {
  accessColumns,
  ownerColumn,
} from "@/shared/console/materials/cells/columns"
import { type FolderNames } from "@/shared/console/materials/folders"
import {
  type MaterialColumn,
  MaterialList,
} from "@/shared/console/materials/list"
import { fileOwner } from "@/shared/console/materials/owners"
import { absoluteTime, relativeTime } from "@/shared/console/time"
import { fileKind } from "@/shared/files/kind"
import { formatFileSize } from "@/shared/files/size"
import { FileRowMenu } from "../menu"
import { type FileRow } from "../types"
import { FileNameCell, FileTypeCell } from "./cells"
import { fileNoun } from "./config"

const columns: MaterialColumn<FileRow>[] = [
  {
    cell: (file) => formatFileSize(file.size),
    className: "text-muted-foreground",
    head: { sortKey: "size" },
    label: "Size",
    tier: "md",
  },
  {
    cell: (file) => <FileTypeCell file={file} />,
    head: { facets: ["kind"] },
    label: "Type",
    tier: "2xl",
  },
  ...accessColumns<FileRow>(),
  {
    cell: (file, context) => relativeTime(file.createdAt, context.now),
    className: "text-muted-foreground",
    head: { sortKey: "created" },
    label: "Created",
    tier: "5xl",
    title: (file) => absoluteTime(file.createdAt),
  },
  ownerColumn(fileOwner, "4xl"),
  {
    cell: (file, context) => relativeTime(file.updatedAt, context.now),
    className: "text-muted-foreground",
    head: { sortKey: "updated" },
    label: "Last Updated",
    tier: "xs",
    title: (file) => absoluteTime(file.updatedAt),
  },
]

export function FileTable({
  config,
  controls,
  files,
  folders,
  hasFilters,
  isLoading,
  onAccess,
  onDelete,
  onMoveToFolder,
  onUpload,
  pendingFileId,
  selection,
  selectionActions,
}: {
  config: ListConfig<FileRow>
  controls: ListControls
  files: FileRow[]
  folders: FolderNames | undefined
  hasFilters: boolean
  isLoading: boolean
  onAccess: (file: FileRow) => void
  onDelete: (file: FileRow) => void
  onMoveToFolder: (file: FileRow) => void
  onUpload: () => void
  pendingFileId: FileRow["fileId"] | undefined
  selection: RowSelection<FileRow>
  selectionActions: SelectionActions
}) {
  if (isLoading) {
    return <ConsoleListLoading />
  }

  return (
    <MaterialList
      config={config}
      controls={controls}
      folders={folders}
      hasFilters={hasFilters}
      kind={{
        columns,
        creates: [{ icon: Upload, label: "Upload file", onSelect: onUpload }],
        description:
          "Files Jori saves during runs and uploads from your team appear here.",
        drag: fileDragItem,
        editKind: "file",
        icon: Files,
        identify: (file) => file.fileId,
        menu: (file) => (
          <FileRowMenu
            file={file}
            isPending={pendingFileId === file.fileId}
            onAccess={onAccess}
            onDelete={onDelete}
            onMoveToFolder={onMoveToFolder}
          />
        ),
        nameCell: (file) => <FileNameCell file={file} />,
        noun: fileNoun,
        rowIcon: (file) => fileKind(file.mimeType, file.name).icon,
      }}
      rows={files}
      selection={selection}
      selectionActions={selectionActions}
      unauthorizedMessage={undefined}
    />
  )
}

/** A file as a drag carries it. */
function fileDragItem(file: FileRow): ResourceDragItem {
  return {
    type: "file",
    id: file.fileId,
    name: file.name,
    mimeType: file.mimeType,
    folderId: file.folderId,
  }
}
