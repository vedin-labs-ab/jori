import { useAction, useMutation } from "convex/react"
import { type FunctionArgs } from "convex/server"
import { type GenericId } from "convex/values"
import { type UploadAction } from "@/shared/console/files/upload"
import { api } from "../../../convex/_generated/api"
import { uploadToStorage } from "./storage"

/** Uploads one file's blob to storage and records it as a file row. */
export function useUploadAction(organizationId: string): UploadAction {
  const generateUploadUrl = useMutation(api.files.console.uploadUrl)
  const createFile = useAction(api.files.console.create)

  return async (file, values) => {
    const { key, url } = await generateUploadUrl({ organizationId })

    await uploadToStorage(url, file)
    await createFile({
      organizationId,
      key,
      name: file.name,
      visibility: values.visibility as FunctionArgs<
        typeof api.files.console.create
      >["visibility"],
      folderId:
        values.folderId === null
          ? undefined
          : (values.folderId as GenericId<"folders">),
    })
  }
}
