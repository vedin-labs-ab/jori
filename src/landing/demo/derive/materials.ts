import { countLeafProperties } from "@contracts/schema/count"
import {
  type FileSiblings,
  fileSiblings,
} from "@/shared/console/files/siblings"
import { type FileDetail, type FileRow } from "@/shared/console/files/types"
import {
  type MoveResourceTarget,
  type MoveSubject,
  resourceSubject,
} from "@/shared/console/folders/types"
import {
  type StoreDetail,
  type StoreSummary,
} from "@/shared/console/stores/types"
import {
  type TableDetail,
  type TableSummary,
} from "@/shared/console/tables/types"
import { ownerFields } from "../fixtures/people"
import {
  type DemoFile,
  type DemoMaterial,
  type DemoStore,
} from "../fixtures/types"
import { type DemoState } from "../state/types"

// The material lists' rows and one material's detail, read off the
// workspace the way the console's queries summarize their documents.

export function materialOf(state: DemoState, id: string) {
  return state.materials.find((material) => material.id === id)
}

export function tableSummaries(state: DemoState): TableSummary[] {
  return state.materials.flatMap((material) =>
    material.kind === "table" ? [tableSummary(material)] : []
  )
}

export function tableDetail(
  state: DemoState,
  tableId: string
): TableDetail | undefined {
  const material = materialOf(state, tableId)

  return material?.kind === "table" ? tableSummary(material) : undefined
}

export function tableRows(state: DemoState, tableId: string) {
  const material = materialOf(state, tableId)

  return material?.kind === "table" ? material.rows : []
}

export function storeSummaries(state: DemoState): StoreSummary[] {
  return state.materials.flatMap((material) =>
    material.kind === "store" ? [storeSummary(material)] : []
  )
}

export function storeDetail(
  state: DemoState,
  storeId: string
): StoreDetail | undefined {
  const material = materialOf(state, storeId)

  return material?.kind === "store"
    ? { ...storeSummary(material), value: material.value }
    : undefined
}

export function storeSummary(material: DemoStore): StoreSummary {
  return {
    ...owned(material),
    storeId: material.id,
    schema: material.schema,
    schemaHash: "demo",
    propertyCount: countLeafProperties(material.schema),
    archivedAt: undefined,
    version: material.version,
  }
}

export function fileRows(state: DemoState): FileRow[] {
  return state.materials.flatMap((material) =>
    material.kind === "file" ? [fileRowOf(material)] : []
  )
}

/** A file's detail is its row: the console's queries answer both with
 *  the same shape. */
export function fileDetail(
  state: DemoState,
  fileId: string
): FileDetail | undefined {
  const material = materialOf(state, fileId)

  return material?.kind === "file" ? fileRowOf(material) : undefined
}

/** The file's neighbors in the list's canonical order, newest first. */
export function fileSiblingsOf(state: DemoState, fileId: string): FileSiblings {
  const rows = fileRows(state).sort(
    (left, right) => right.createdAt - left.createdAt
  )

  return fileSiblings(rows, fileId as FileRow["fileId"])
}

/** A file as its list row. The url is what the viewer fetches: text held
 *  in memory travels as a data url, so an edit changes what the next
 *  visit reads; a binary file points at the asset that backs it. */
export function fileRowOf(material: DemoFile): FileRow {
  return {
    ...owned(material),
    fileId: material.id,
    mimeType: material.mimeType,
    size: material.size,
    source: material.source,
    runId: undefined,
    url: fileUrl(material),
  }
}

function fileUrl(material: DemoFile) {
  if (material.text !== undefined) {
    return `data:${material.mimeType};charset=utf-8,${encodeURIComponent(material.text)}`
  }

  return material.asset ?? null
}

export function tableSummary(
  material: Extract<DemoMaterial, { kind: "table" }>
): TableSummary {
  return {
    ...owned(material),
    tableId: material.id,
    columns: material.columns,
    rowCount: material.rows.length,
    archivedAt: undefined,
  }
}

/** What every kind shares, with the owner's display attached. */
function owned(material: DemoMaterial) {
  return {
    name: material.name,
    visibility: material.visibility,
    ...ownerFields(material.ownerId),
    folderId: material.folderId,
    createdAt: material.createdAt,
    updatedAt: material.updatedAt,
  }
}

/** A material as one of the move dialog's resources: tables and stores
 *  are collections to the filing system, files are files. */
export function materialMoveTarget(material: DemoMaterial): MoveResourceTarget {
  return {
    resourceType: material.kind === "file" ? "file" : "collection",
    resourceId: material.id,
    name: material.name,
    folderId: material.folderId,
  }
}

/** A material on its own as the move dialog's subject. */
export function materialMoveSubject(material: DemoMaterial): MoveSubject {
  return resourceSubject([materialMoveTarget(material)])
}
