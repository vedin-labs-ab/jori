import { type GenericId } from "convex/values"
import { type FolderRow } from "@/shared/console/folders/types"
import { type TableColumn, type TableRow } from "@/shared/console/tables/types"

// The workspace's records, typed against what the views read so that a
// row from here and a row from the console are the same row.

export type CollectionId = GenericId<"collections">
export type FileId = GenericId<"files">
export type FolderId = GenericId<"folders">
export type JobId = GenericId<"jobs">
export type PersonId = GenericId<"persons">

/** Visibility as the views' rows store it, with branded person ids. */
export type StoredVisibility = FolderRow["visibility"]

export type DemoFolder = {
  folderId: FolderId
  name: string
  parentId: FolderId | undefined
  visibility: StoredVisibility
  createdBy: PersonId
  createdAt: number
  updatedAt: number
}

type MaterialBase = {
  name: string
  description?: string
  folderId?: FolderId
  visibility: StoredVisibility
  /** Absent for what an agent run made, which reads as Jori's own. */
  ownerId?: PersonId
  createdAt: number
  updatedAt: number
}

export type DemoTable = MaterialBase & {
  kind: "table"
  id: CollectionId
  columns: TableColumn[]
  rows: TableRow[]
}

export type DemoStore = MaterialBase & {
  kind: "store"
  id: CollectionId
  propertyCount?: number
  version: number
}

export type DemoFile = MaterialBase & {
  kind: "file"
  id: FileId
  mimeType: string
  size: number
  source: "run" | "upload"
}

export type DemoMaterial = DemoTable | DemoStore | DemoFile
