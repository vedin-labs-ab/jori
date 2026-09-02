import { type JsonSchemaObject } from "@contracts/schema/validate"
import { type FiledResourceType } from "@/shared/console/folders/types"
import { type Job } from "@/shared/console/jobs/types"
import { type ShareRow } from "@/shared/console/materials/history"
import { type ActivityResult } from "@/shared/console/runs/activity/types"
import { type ExecutionItem } from "@/shared/console/runs/types"
import {
  type RowInsertAnchor,
  type TableColumn,
  type TableRow,
} from "@/shared/console/tables/types"
import {
  type DemoFolder,
  type DemoMaterial,
  type FolderId,
  type StoredVisibility,
} from "../fixtures/types"
import { type UsageRow } from "../fixtures/usage"

/** Copperline's workspace, held in memory for as long as the page is open.
 *  Every mock reads it and every action writes it, so a change made in one
 *  section shows in the next. */
export type DemoState = {
  activity: Record<string, ActivityResult>
  folders: DemoFolder[]
  jobs: Job[]
  materials: DemoMaterial[]
  now: number
  runs: ExecutionItem[]
  shares: Record<string, ShareRow[]>
  usage: UsageRow[]
}

/** What a visibility applies to: a folder, a material, or a job. */
export type VisibilityTarget = {
  kind: "folder" | "table" | "store" | "file" | "job"
  id: string
}

export type FolderAction =
  | {
      type: "createFolder"
      at: number
      folderId: FolderId
      name: string
      parentId?: FolderId
    }
  | { type: "renameFolder"; at: number; folderId: FolderId; name: string }
  | {
      type: "moveFolder"
      at: number
      folderId: FolderId
      parentId: FolderId | null
    }
  | { type: "deleteFolder"; folderId: FolderId; deleteResources: boolean }
  | {
      type: "fileResource"
      at: number
      resourceType: FiledResourceType | "table" | "store"
      id: string
      folderId: FolderId | null
    }

export type MaterialAction =
  | { type: "createMaterial"; material: DemoMaterial }
  | {
      type: "updateMaterial"
      at: number
      id: string
      name: string
      description: string
    }
  | { type: "removeMaterial"; id: string }
  | { type: "writeStoreValue"; at: number; storeId: string; value: unknown }
  | {
      type: "writeStoreSchema"
      at: number
      storeId: string
      schema: JsonSchemaObject | undefined
    }
  | { type: "writeFileText"; at: number; fileId: string; text: string }

export type JobAction =
  | { type: "setJobPaused"; at: number; jobId: string; paused: boolean }
  | { type: "deleteJob"; jobId: string }
  | { type: "createJob"; job: Job }
  | { type: "updateJob"; job: Job }

export type RunAction =
  | { type: "stopRun"; at: number; runId: string; actor: string }
  | {
      type: "decideApproval"
      at: number
      runId: string
      approvalId: string
      decision: "approved" | "denied"
    }
  | {
      type: "settleOffer"
      at: number
      runId: string
      offerId: string
      state: "cancelled" | "connected"
    }

export type TableAction =
  | {
      type: "commitCell"
      at: number
      tableId: string
      rowId: string
      columnId: string
      value: unknown
    }
  | {
      type: "insertRow"
      at: number
      tableId: string
      row: TableRow
      anchor?: RowInsertAnchor
    }
  | { type: "deleteRow"; at: number; tableId: string; rowId: string }
  | { type: "setColumns"; at: number; tableId: string; columns: TableColumn[] }

export type AccessAction =
  | {
      type: "setVisibility"
      at: number
      target: VisibilityTarget
      visibility: StoredVisibility
    }
  | { type: "mintShare"; materialId: string; share: ShareRow }
  | { type: "revokeShare"; materialId: string; shareId: string }

export type DemoAction =
  | AccessAction
  | FolderAction
  | JobAction
  | MaterialAction
  | RunAction
  | TableAction
