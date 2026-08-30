import { type Scope } from "@contracts/permissions/scope"
import { useMutation } from "convex/react"
import { type GenericId } from "convex/values"
import { useState } from "react"
import { toast } from "sonner"
import { api } from "../../../../convex/_generated/api"
import { countNoun } from "../../shared/list/bulk"
import { uploadToStorage } from "../storage"

export type UploadStatus = "done" | "error" | "pending" | "uploading"

export type QueuedUpload = {
  file: File
  key: string
  status: UploadStatus
}

const fileNoun = { plural: "files", singular: "file" }

/** Files still awaiting an upload attempt: everything but completed rows,
 *  so a retry after partial failure re-runs only what failed. */
export function pendingUploads(items: QueuedUpload[]) {
  return items.filter((item) => item.status !== "done")
}

/** The queued-file list: append with dedupe, remove, clear, and per-row
 *  status updates. Duplicate picks (same name and size) are ignored. */
export function useUploadQueue() {
  const [items, setItems] = useState<QueuedUpload[]>([])

  function addFiles(files: File[]) {
    setItems((current) => withFiles(current, files))
  }

  function removeFile(key: string) {
    setItems((current) => current.filter((item) => item.key !== key))
  }

  function clear() {
    setItems([])
  }

  function setStatus(key: string, status: UploadStatus) {
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, status } : item))
    )
  }

  return { addFiles, clear, items, removeFile, setStatus }
}

/** Everything the upload dialog needs: the queue, the shared batch fields,
 *  and a sequential submit that uploads every queued file. */
export function useFileUpload(
  organizationId: string,
  initialFolderId: string | null,
  onUploaded: () => void
) {
  const queue = useUploadQueue()
  const fields = useUploadFields(initialFolderId)
  const uploadFile = useUploadAction(organizationId)
  const [isUploading, setIsUploading] = useState(false)

  async function submit() {
    const pending = pendingUploads(queue.items)

    if (pending.length === 0 || isUploading) {
      return
    }

    setIsUploading(true)

    try {
      const failed = await runUploads(
        pending,
        (file) => uploadFile(file, fields.values),
        queue.setStatus
      )

      settle(pending.length, failed)
    } finally {
      setIsUploading(false)
    }
  }

  function settle(total: number, failed: number) {
    if (failed > 0) {
      toast.error(`Couldn't upload ${failed} of ${total} files.`)
      return
    }

    toast.success(`Uploaded ${countNoun(total, fileNoun)}.`)
    queue.clear()
    fields.reset()
    onUploaded()
  }

  return { ...queue, ...fields, isUploading, submit }
}

export type FileUpload = ReturnType<typeof useFileUpload>

type UploadValues = {
  folderId: string | null
  scope: Scope
}

/** The Sharing and Folder fields shared by the whole batch. */
function useUploadFields(initialFolderId: string | null) {
  const [scope, setScope] = useState<Scope>("organization")
  const [folderId, setFolderId] = useState(initialFolderId)

  function reset() {
    setFolderId(initialFolderId)
  }

  return {
    folderId,
    reset,
    scope,
    setFolderId,
    setScope,
    values: { folderId, scope } satisfies UploadValues,
  }
}

/** Uploads one file's blob to storage and records it as a file row. */
function useUploadAction(organizationId: string) {
  const generateUploadUrl = useMutation(api.files.console.uploadUrl)
  const createFile = useMutation(api.files.console.create)

  return async (file: File, values: UploadValues) => {
    const storageId = await uploadToStorage(
      await generateUploadUrl({ organizationId }),
      file
    )

    await createFile({
      organizationId,
      storageId,
      name: file.name,
      scope: values.scope,
      folderId:
        values.folderId === null
          ? undefined
          : (values.folderId as GenericId<"folders">),
    })
  }
}

/** Uploads files one at a time, moving each row through uploading and into
 *  done or error, and returns how many failed. */
async function runUploads(
  pending: QueuedUpload[],
  upload: (file: File) => Promise<void>,
  setStatus: (key: string, status: UploadStatus) => void
) {
  let failed = 0

  for (const item of pending) {
    setStatus(item.key, "uploading")

    try {
      await upload(item.file)
      setStatus(item.key, "done")
    } catch {
      failed += 1
      setStatus(item.key, "error")
    }
  }

  return failed
}

function withFiles(current: QueuedUpload[], files: File[]) {
  const known = new Set(current.map((item) => item.key))
  const next = [...current]

  for (const file of files) {
    const key = `${file.name}:${file.size}`

    if (!known.has(key)) {
      known.add(key)
      next.push({ file, key, status: "pending" })
    }
  }

  return next
}
