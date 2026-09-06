import { type JsonSchemaObject } from "@contracts/schema/validate"
import { shareFragment } from "@contracts/shares/fragment"
import { type Visibility } from "@contracts/visibility"
import { type Dispatch } from "react"
import { type FiledResourceType } from "@/shared/console/folders/types"
import { type Job, type JobFormValues } from "@/shared/console/jobs/types"
import { type CreateMaterialArgs } from "@/shared/console/materials/dialogs/create"
import { type MaterialEdit } from "@/shared/console/materials/dialogs/edit"
import { type MintedLink } from "@/shared/console/materials/links"
import {
  type RowInsertAnchor,
  type TableColumn,
} from "@/shared/console/tables/types"
import { jobFromValues } from "../../derive/jobs"
import { hour } from "../../fixtures/clock"
import { type DemoMint, demoId } from "../../fixtures/ids"
import { personName, viewerId } from "../../fixtures/people"
import {
  type CollectionId,
  type DemoMaterial,
  type FolderId,
  type StoredVisibility,
} from "../../fixtures/types"
import { type DemoAction, type VisibilityTarget } from "../types"
import { chatActions } from "./chat"

export type DemoActions = ReturnType<typeof createActions>

/** Everything the views' callbacks can ask of the workspace, each a plain
 *  update dispatched with the moment it happened. Ids come from a counter,
 *  so a session's additions read in the order they were made. */
export function createActions(dispatch: Dispatch<DemoAction>) {
  let counter = 0
  const mint: DemoMint = (table) => {
    counter += 1

    return demoId(table, `new-${counter}`)
  }

  return {
    ...folderActions(dispatch, mint),
    ...materialActions(dispatch, mint),
    ...jobActions(dispatch, mint),
    ...runActions(dispatch),
    ...tableActions(dispatch, mint),
    ...accessActions(dispatch, mint),
    ...chatActions(dispatch, mint),
  }
}

function folderActions(dispatch: Dispatch<DemoAction>, mint: DemoMint) {
  return {
    createFolder: (name: string, parentId?: FolderId) => {
      const folderId = mint("folders")

      dispatch({
        type: "createFolder",
        at: Date.now(),
        folderId,
        name,
        parentId,
      })

      return folderId
    },
    renameFolder: (folderId: FolderId, name: string) =>
      dispatch({ type: "renameFolder", at: Date.now(), folderId, name }),
    moveFolder: (folderId: FolderId, parentId: FolderId | null) =>
      dispatch({ type: "moveFolder", at: Date.now(), folderId, parentId }),
    deleteFolder: (folderId: FolderId, deleteResources: boolean) =>
      dispatch({ type: "deleteFolder", folderId, deleteResources }),
    fileResource: (
      resourceType: FiledResourceType | "table" | "store",
      id: string,
      folderId: FolderId | null
    ) =>
      dispatch({
        type: "fileResource",
        at: Date.now(),
        resourceType,
        id,
        folderId,
      }),
  }
}

function materialActions(dispatch: Dispatch<DemoAction>, mint: DemoMint) {
  return {
    createMaterial: (kind: "table" | "store", args: CreateMaterialArgs) =>
      dispatch({
        type: "createMaterial",
        material: newMaterial(kind, mint("collections"), args, Date.now()),
      }),
    updateMaterial: (id: string, values: MaterialEdit) =>
      dispatch({ type: "updateMaterial", at: Date.now(), id, ...values }),
    removeMaterial: (id: string) => dispatch({ type: "removeMaterial", id }),
    writeStoreValue: (storeId: string, value: unknown) =>
      dispatch({ type: "writeStoreValue", at: Date.now(), storeId, value }),
    writeStoreSchema: (storeId: string, schema: JsonSchemaObject | undefined) =>
      dispatch({ type: "writeStoreSchema", at: Date.now(), storeId, schema }),
    writeFileText: (fileId: string, text: string) =>
      dispatch({ type: "writeFileText", at: Date.now(), fileId, text }),
  }
}

function jobActions(dispatch: Dispatch<DemoAction>, mint: DemoMint) {
  return {
    setJobPaused: (job: Job, paused: boolean) =>
      dispatch({ type: "setJobPaused", at: Date.now(), jobId: job.id, paused }),
    deleteJob: (job: Job) => dispatch({ type: "deleteJob", jobId: job.id }),
    /** Saves the editor's values as a new job or over an existing one, and
     *  answers with the validation error when there is one. The save module
     *  arrives on first use: it carries the instructions codec, and the
     *  editor that needs it has loaded by the time anyone can save. */
    saveJob: async (values: JobFormValues, existing?: Job) => {
      const args = await import("@/shared/console/jobs/editor/save/args")
      const result = jobFromValues(values, {
        args,
        existing,
        id: mint("jobs"),
        at: Date.now(),
      })

      if ("error" in result) {
        return result.error
      }

      dispatch({
        type: existing === undefined ? "createJob" : "updateJob",
        job: result.job,
      })

      return undefined
    },
  }
}

function runActions(dispatch: Dispatch<DemoAction>) {
  const actor = personName(viewerId) ?? "you"

  return {
    stopRun: (runId: string) =>
      dispatch({ type: "stopRun", at: Date.now(), runId, actor }),
    decideApproval: (
      runId: string,
      approvalId: string,
      decision: "approved" | "denied"
    ) =>
      dispatch({
        type: "decideApproval",
        at: Date.now(),
        runId,
        approvalId,
        decision,
      }),
    settleOffer: (
      runId: string,
      offerId: string,
      state: "cancelled" | "connected"
    ) =>
      dispatch({ type: "settleOffer", at: Date.now(), runId, offerId, state }),
  }
}

function tableActions(dispatch: Dispatch<DemoAction>, mint: DemoMint) {
  return {
    commitCell: (
      tableId: string,
      rowId: string,
      columnId: string,
      value: unknown
    ) =>
      dispatch({
        type: "commitCell",
        at: Date.now(),
        tableId,
        rowId,
        columnId,
        value,
      }),
    insertRow: (
      tableId: string,
      values: Record<string, unknown>,
      anchor?: RowInsertAnchor
    ) => {
      const at = Date.now()
      const row = {
        rowId: mint("documents"),
        values,
        version: 1,
        createdAt: at,
        updatedAt: at,
      }

      dispatch({ type: "insertRow", at, tableId, row, anchor })

      return row.rowId
    },
    deleteRow: (tableId: string, rowId: string) =>
      dispatch({ type: "deleteRow", at: Date.now(), tableId, rowId }),
    setColumns: (tableId: string, columns: TableColumn[]) =>
      dispatch({ type: "setColumns", at: Date.now(), tableId, columns }),
  }
}

function accessActions(dispatch: Dispatch<DemoAction>, mint: DemoMint) {
  return {
    setVisibility: (target: VisibilityTarget, visibility: Visibility) =>
      dispatch({
        type: "setVisibility",
        at: Date.now(),
        target,
        // The field holds ids as plain strings; the rows brand them.
        visibility: visibility as StoredVisibility,
      }),
    /** Mints a link the way the console does: a secret in the fragment of
     *  the material's own path, expiring on the clock the dialog chose. */
    mintShare: (
      materialId: string,
      kind: "table" | "store" | "file",
      expiresInHours: number
    ): MintedLink => {
      const at = Date.now()
      const share = {
        shareId: mint("shares"),
        createdAt: at,
        expiresAt: at + expiresInHours * hour,
      }
      const secret = `demo-${share.shareId}`
      const urlPath = `/${kind}s/${materialId}#${shareFragment(secret)}`

      dispatch({ type: "mintShare", materialId, share })

      return { url: urlPath, urlPath, expiresAt: share.expiresAt }
    },
    revokeShare: (materialId: string, shareId: string) =>
      dispatch({ type: "revokeShare", materialId, shareId }),
  }
}

function newMaterial(
  kind: "table" | "store",
  id: CollectionId,
  args: CreateMaterialArgs,
  at: number
): DemoMaterial {
  const base = {
    id,
    name: args.name.trim(),
    folderId: args.folderId as FolderId | undefined,
    visibility: args.visibility as StoredVisibility,
    ownerId: viewerId,
    createdAt: at,
    updatedAt: at,
  }

  return kind === "table"
    ? { ...base, kind, columns: [], rows: [] }
    : { ...base, kind, value: null, version: 0 }
}
