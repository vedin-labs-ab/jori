import { useAction, useMutation } from "convex/react"
import { type FileSave } from "@/shared/console/files/editor/section"
import { type FileDetail } from "@/shared/console/files/types"
import { api } from "../../../convex/_generated/api"
import { uploadToStorage } from "./storage"

/** Uploads the editor's buffer as a new storage blob and swaps it into
 *  the file. Failures report as false; the autosave loop keeps the buffer
 *  and retries. */
export function useFileSave(
  organizationId: string,
  file: Pick<FileDetail, "fileId" | "mimeType">
): FileSave {
  const generateUploadUrl = useMutation(api.files.console.uploadUrl)
  const replaceFile = useAction(api.files.console.replace)

  return async function save(text: string) {
    try {
      const { key, url } = await generateUploadUrl({ organizationId })

      await uploadToStorage(url, new Blob([text], { type: file.mimeType }))
      await replaceFile({ organizationId, fileId: file.fileId, key })

      return true
    } catch {
      return false
    }
  }
}
