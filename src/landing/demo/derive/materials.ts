import { type FileRow } from "@/shared/console/files/types"
import {
  type MoveResourceTarget,
  type MoveSubject,
} from "@/shared/console/folders/types"
import { type StoreSummary } from "@/shared/console/stores/types"
import {
  type TableDetail,
  type TableSummary,
} from "@/shared/console/tables/types"
import { personName } from "../fixtures/people"
import { type DemoFile, type DemoMaterial } from "../fixtures/types"
import { type DemoState } from "../state/types"

// The material lists' rows and one table's detail, read off the workspace
// the way the console's queries summarize their documents.

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
    material.kind === "store"
      ? [
          {
            ...owned(material),
            storeId: material.id,
            schema: undefined,
            schemaHash: "demo",
            propertyCount: material.propertyCount,
            archivedAt: undefined,
            version: material.version,
          },
        ]
      : []
  )
}

export function fileRows(state: DemoState): FileRow[] {
  return state.materials.flatMap((material) =>
    material.kind === "file" ? [fileRowOf(material)] : []
  )
}

/** A file as its list row: the demo has no storage, so no download url. */
export function fileRowOf(material: DemoFile): FileRow {
  return {
    ...owned(material),
    fileId: material.id,
    mimeType: material.mimeType,
    size: material.size,
    source: material.source,
    runId: undefined,
    url: null,
  }
}

function tableSummary(
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
    description: material.description,
    visibility: material.visibility,
    ownerId: material.ownerId,
    folderId: material.folderId,
    createdAt: material.createdAt,
    updatedAt: material.updatedAt,
    ownerName: personName(material.ownerId),
    ownerImage: undefined,
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
  return { kind: "resources", resources: [materialMoveTarget(material)] }
}
