import { type FunctionArgs, type FunctionReturnType } from "convex/server"
import { Database, type LucideIcon, Table2, Workflow } from "lucide-react"
import { fileKind } from "@/shared/files/kind"
import { type api } from "../../../../convex/_generated/api"

type FolderTreeResult = FunctionReturnType<typeof api.folders.console.tree>
export type FolderRow = FolderTreeResult["folders"][number]

export type FolderRootsResult = FunctionReturnType<
  typeof api.folders.console.roots
>

/** What a listing row shows of a folder; the overview's roots and a folder
 *  page's listed children both satisfy it. */
export type ListedFolder = Pick<
  FolderRootsResult["folders"][number],
  | "createdBy"
  | "folderCount"
  | "folderId"
  | "hasContents"
  | "name"
  | "ownerId"
  | "ownerImage"
  | "ownerName"
  | "parentId"
  | "resourceCount"
  | "updatedAt"
  | "visibility"
>

export type FolderDetail = NonNullable<
  FunctionReturnType<typeof api.folders.console.get>["folder"]
>

/** What the lifecycle dialogs need of a folder; tree rows and the folder
 *  page's detail both satisfy it. */
export type ManagedFolder = Pick<
  FolderRow,
  "createdBy" | "folderId" | "name" | "parentId" | "visibility"
>

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
    case "job":
      return { icon: Workflow, label: "Job" }
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

export function moveTarget(
  resourceType: FiledResourceType,
  resourceId: string,
  material: { name: string; folderId?: string }
): MoveResourceTarget {
  return {
    resourceType,
    resourceId,
    name: material.name,
    folderId: material.folderId,
  }
}

/** A folder as the move dialog sees it: what to re-parent, plus where it
 *  currently sits so the picker can mark it. */
export type MoveFolderTarget = {
  folderId: string
  name: string
  parentId?: string
}

/** What the move dialog moves: folders re-parent through `move`, filed
 *  resources re-file through `file` — one row from a menu or a drag, or a
 *  whole selection of either or both. */
export type MoveSubject = {
  folders: MoveFolderTarget[]
  resources: MoveResourceTarget[]
}

export function folderSubject(
  folder: Pick<ManagedFolder, "folderId" | "name" | "parentId">
): MoveSubject {
  const { folderId, name, parentId } = folder

  return { folders: [{ folderId, name, parentId }], resources: [] }
}

export function resourceSubject(resources: MoveResourceTarget[]): MoveSubject {
  return { folders: [], resources }
}

export function subjectSize(subject: MoveSubject) {
  return subject.folders.length + subject.resources.length
}

/** How a move names its subject: quoted for a single item, a count for a
 *  bulk selection. */
export function subjectName(subject: MoveSubject) {
  const [first] = [...subject.folders, ...subject.resources]

  return subjectSize(subject) === 1 && first !== undefined
    ? `"${first.name}"`
    : `${subjectSize(subject)} items`
}

/** What the folder surfaces can create in place, each through the same
 *  dialog its own list page uses. */
export type FolderCreation = "table" | "store" | "file" | "job"

export type CreationRequest = {
  creation: FolderCreation
  /** Pre-selects the dialogs' Folder field; undefined starts at the root. */
  folderId?: string
}

/** What a folder's menus ask of the lifecycle dialogs. One request value
 *  drives them all, so each surface renders a single set of dialogs and
 *  hands its rows a way to raise requests. */
export type FolderDialogRequest =
  | { type: "access"; folder: ManagedFolder }
  | { type: "create"; parentId?: string }
  | { type: "delete"; folder: ManagedFolder }
  | { type: "move"; folder: ManagedFolder }
  | { type: "rename"; folder: ManagedFolder }
