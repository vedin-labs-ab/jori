import { type GenericId } from "convex/values"

/** POSTs a blob to a Convex upload URL and returns the new storage id.
 *  Convex records the blob's content type as the file's mime type. */
export async function uploadToStorage(uploadUrl: string, blob: Blob) {
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Type": blob.type === "" ? "application/octet-stream" : blob.type,
    },
    body: blob,
  })

  if (!response.ok) {
    throw new Error(`Upload failed: ${await response.text()}`)
  }

  const { storageId } = (await response.json()) as {
    storageId: GenericId<"_storage">
  }

  return storageId
}
