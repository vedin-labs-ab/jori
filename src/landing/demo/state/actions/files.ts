import { type Dispatch } from "react"
import { type UploadValues } from "@/shared/console/files/upload"
import { type DemoMint } from "../../fixtures/ids"
import { viewerId } from "../../fixtures/people"
import {
  type DemoFile,
  type FolderId,
  type StoredVisibility,
} from "../../fixtures/types"
import { type DemoAction } from "../types"

export function fileActions(dispatch: Dispatch<DemoAction>, mint: DemoMint) {
  return {
    /** Files a picked file the way an upload would: the viewer reads it
     *  through an object URL, so it opens the way a stored file does. */
    addFile: (file: File, values: UploadValues) => {
      const material = uploadedFile(file, mint("files"), values, Date.now())
      dispatch({ type: "createMaterial", material })
      return material
    },
  }
}

/** Browsers leave the mime type blank for what they cannot name; storage
 *  would record the same generic type. */
function uploadedFile(
  file: File,
  id: DemoFile["id"],
  values: UploadValues,
  at: number
): DemoFile {
  return {
    kind: "file",
    id,
    name: file.name,
    folderId:
      values.folderId === null ? undefined : (values.folderId as FolderId),
    visibility: values.visibility as StoredVisibility,
    ownerId: viewerId,
    createdAt: at,
    updatedAt: at,
    mimeType: file.type === "" ? "application/octet-stream" : file.type,
    size: file.size,
    source: "upload",
    asset: URL.createObjectURL(file),
  }
}
