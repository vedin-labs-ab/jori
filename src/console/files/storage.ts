/** PUTs a blob to a signed upload URL. Storage records the blob's content
 *  type as the file's mime type. */
export async function uploadToStorage(uploadUrl: string, blob: Blob) {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": blob.type === "" ? "application/octet-stream" : blob.type,
      "If-None-Match": "*",
    },
    body: blob,
  })

  if (!response.ok) {
    throw new Error("Upload failed")
  }
}
