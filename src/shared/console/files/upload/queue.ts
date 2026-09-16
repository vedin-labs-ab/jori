import { type Visibility } from "@contracts/visibility"
import { useState } from "react"
import { toast } from "sonner"
import { countNoun } from "@/shared/console/count"

export type UploadStatus = "done" | "error" | "pending" | "uploading"

export type QueuedUpload = {
  file: File
  key: string
  status: UploadStatus
}

/** The Folder and Audience fields shared by the whole batch. */
export type UploadValues = {
  folderId: string | null
  visibility: Visibility
}

/** How the host lands one file: whatever storing it takes, resolving once
 *  the file is a row. A rejection marks the row failed and keeps it queued
 *  for a retry. */
export type UploadAction = (file: File, values: UploadValues) => Promise<void>

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
 *  and a sequential submit that hands every queued file to the host. */
export function useFileUpload(
  upload: UploadAction,
  initialFolderId: string | null,
  onUploaded: () => void
) {
  const queue = useUploadQueue()
  const fields = useUploadFields(initialFolderId)
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
        (file) => upload(file, fields.values),
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

/** The Access and Folder fields shared by the whole batch. */
function useUploadFields(initialFolderId: string | null) {
  const [visibility, setVisibility] = useState<Visibility>({
    mode: "organization",
  })
  const [folderId, setFolderId] = useState(initialFolderId)

  function reset() {
    setFolderId(initialFolderId)
  }

  return {
    folderId,
    reset,
    setFolderId,
    setVisibility,
    values: { folderId, visibility } satisfies UploadValues,
    visibility,
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
