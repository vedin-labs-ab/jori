import { type FunctionArgs, type FunctionReturnType } from "convex/server"
import {
  CalendarClock,
  Database,
  Folder,
  FolderDot,
  FolderOpen,
  FolderOpenDot,
  type LucideIcon,
  Table2,
} from "lucide-react"
import { fileKind } from "@/shared/files/kind"
import { type api } from "../../../convex/_generated/api"

export type FolderTreeResult = FunctionReturnType<
  typeof api.folders.console.tree
>
export type FolderRow = FolderTreeResult["folders"][number]

/** What a listing row shows of a folder; tree rows and a folder's listed
 *  children both satisfy it. */
export type ListedFolder = Pick<
  FolderRow,
  "folderId" | "hasContents" | "name" | "updatedAt"
>

/** The icon for a folder row anywhere folders list: a dot marks a folder
 *  holding anything — subfolders or filed resources — and an open body
 *  marks expansion, orthogonally. */
export function folderIcon(hasContents: boolean, isExpanded = false) {
  if (isExpanded) {
    return hasContents ? FolderOpenDot : FolderOpen
  }

  return hasContents ? FolderDot : Folder
}

export type FolderDetail = NonNullable<
  FunctionReturnType<typeof api.folders.console.get>["folder"]
>

/** What the lifecycle dialogs need of a folder; tree rows and the folder
 *  page's detail both satisfy it. */
export type ManagedFolder = Pick<FolderRow, "folderId" | "name" | "parentId">

export type FolderContentsResult = FunctionReturnType<
  typeof api.folders.console.contents
>
export type FolderResource = FolderContentsResult["resources"][number]

/** What `folders.console.file` files: tables and stores are collections. */
export type FiledResourceType = FunctionArgs<
  typeof api.folders.console.file
>["resourceType"]

export function toFiledType(type: FolderResource["type"]): FiledResourceType {
  return type === "table" || type === "store" ? "collection" : type
}

/** How a filed resource presents in lists and drag ghosts. The parameter
 *  is structural so both full rows and drag payloads fit. */
export function resourcePresentation(resource: {
  type: FolderResource["type"]
  name: string
  mimeType?: string
}): { icon: LucideIcon; label: string } {
  switch (resource.type) {
    case "table":
      return { icon: Table2, label: "Table" }
    case "store":
      return { icon: Database, label: "Store" }
    case "file":
      return fileKind(resource.mimeType ?? "", resource.name)
    case "automation":
      return { icon: CalendarClock, label: "Automation" }
  }
}

/** A filed resource as the move dialog sees it: what to re-file, plus
 *  where it currently sits so the picker can mark it. */
export type MoveResourceTarget = {
  resourceType: FiledResourceType
  resourceId: string
  name: string
  folderId?: string
}

/** What the move dialog moves: a folder re-parents through `move`, filed
 *  resources — one or a bulk selection — re-file through `file`. */
export type MoveSubject =
  | { kind: "folder"; folderId: string; name: string; parentId?: string }
  | { kind: "resources"; resources: MoveResourceTarget[] }
