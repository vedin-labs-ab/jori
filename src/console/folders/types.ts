import { type FunctionArgs, type FunctionReturnType } from "convex/server"
import { type api } from "../../../convex/_generated/api"

export type FolderRow = FunctionReturnType<
  typeof api.folders.console.tree
>["folders"][number]

export type FolderDetail = NonNullable<
  FunctionReturnType<typeof api.folders.console.get>["folder"]
>

export type FolderContentsResult = FunctionReturnType<
  typeof api.folders.console.contents
>
export type FolderResource = FolderContentsResult["resources"][number]

/** What `folders.console.file` files: tables and stores are collections. */
export type FiledResourceType = FunctionArgs<
  typeof api.folders.console.file
>["resourceType"]

export function toFiledType(resource: FolderResource): FiledResourceType {
  return resource.type === "table" || resource.type === "store"
    ? "collection"
    : resource.type
}

/** A filed resource as the move dialog sees it: what to re-file, plus
 *  where it currently sits so the picker can mark it. */
export type MoveResourceTarget = {
  resourceType: FiledResourceType
  resourceId: string
  name: string
  folderId?: string
}

/** What the move dialog moves: a folder re-parents through `move`, anything
 *  else re-files through `file`. */
export type MoveSubject =
  | { kind: "folder"; folderId: string; name: string; parentId?: string }
  | ({ kind: "resource" } & MoveResourceTarget)
