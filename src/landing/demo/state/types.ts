import { type ChoicesAnswer } from "@contracts/replies/answers"
import { type ReferenceTarget } from "@contracts/replies/references"

import { type JsonSchemaObject } from "@contracts/schema/validate"
import { type ChatRun } from "@/shared/console/chat/types"
import { type FiledResourceType } from "@/shared/console/folders/types"
import { type Job } from "@/shared/console/jobs/types"
import { type ShareRow } from "@/shared/console/materials/history"
import { type ActivityResult } from "@/shared/console/runs/activity/types"
import {
  type RowInsertAnchor,
  type TableColumn,
  type TableRow,
} from "@/shared/console/tables/types"
import { type DemoConversation, type DemoReply } from "../fixtures/chat"
import {
  type DemoFolder,
  type DemoMaterial,
  type DemoRun,
  type FolderId,
  type StoredVisibility,
} from "../fixtures/types"
import { type UsageRow } from "../fixtures/usage"

/** Copperline's workspace, held in memory for as long as the page is open.
 *  Every mock reads it and every action writes it, so a change made in one
 *  section shows in the next. */
export type DemoState = {
  activity: Record<string, ActivityResult>
  chat: DemoChat
  folders: DemoFolder[]
  jobs: Job[]
  materials: DemoMaterial[]
  now: number
  runs: DemoRun[]
  shares: Record<string, ShareRow[]>
  usage: UsageRow[]
}

/** The conversations had, newest first, and the one run a chat can have
 *  going: which conversation it answers, what it will say, and how much
 *  of that it has said. */
export type DemoChat = {
  conversations: DemoConversation[]
  live: DemoLiveReply | null
}

export type DemoLiveReply = {
  conversationId: string
  run: ChatRun
  reply: DemoReply
  pending?: DemoReply[]
  startedAt: number
  /** Characters of the reply revealed so far, its thinking before its
   *  text; negative while working. */
  revealed: number
}

/** What a visibility applies to in the workspace. */
export type VisibilityTarget = {
  kind: "folder" | "table" | "store" | "file" | "job" | "chat"
  id: string
}

type FolderAction =
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

type MaterialAction =
  | { type: "createMaterial"; material: DemoMaterial }
  | {
      type: "updateMaterial"
      at: number
      id: string
      name: string
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

type JobAction =
  | { type: "setJobPaused"; at: number; jobId: string; paused: boolean }
  | { type: "deleteJob"; jobId: string }
  | { type: "createJob"; job: Job }
  | { type: "updateJob"; job: Job }

type RunAction =
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

type TableAction =
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

type AccessAction =
  | {
      type: "setVisibility"
      at: number
      target: VisibilityTarget
      visibility: StoredVisibility
    }
  | { type: "mintShare"; materialId: string; share: ShareRow }
  | { type: "revokeShare"; materialId: string; shareId: string }

type ChatAction =
  | {
      type: "sendChatMessage"
      at: number
      conversationId: string
      messageId: string
      runId: string
      text: string
      folderId?: string
      references?: ReferenceTarget[]
      answer?: ChoicesAnswer
      reply: DemoReply
    }
  | { type: "advanceChatReply"; at: number }
  | { type: "stopChatRun"; at: number }

export type DemoAction =
  | AccessAction
  | ChatAction
  | FolderAction
  | JobAction
  | MaterialAction
  | RunAction
  | TableAction
