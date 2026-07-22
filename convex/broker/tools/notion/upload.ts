import {
  type AssetContext,
  type RunAsset,
  readRunAssets,
} from "../../../assets/read"
import {
  notionJson,
  notionMultipartJson,
} from "../../../integrations/notion/api"
import { copyBytesToArrayBuffer } from "../../../shared/encoding"
import { optionalString, requiredString } from "../../../shared/input"

const maxSinglePartUploadBytes = 20 * 1024 * 1024
const maxFilenameBytes = 900

export async function uploadNotionFile(
  token: string,
  args: Record<string, unknown>,
  context?: AssetContext
) {
  const asset = await readUploadAsset(context, args)
  const upload = await createFileUpload(token, asset)
  const uploadId = requiredString(upload.id, "Notion file upload id")
  const sent = await sendFileUpload(token, uploadId, asset)

  if (sent.status !== "uploaded") {
    throw new Error(`Notion file upload did not finish: ${sent.status}`)
  }

  return {
    fileUpload: sent,
    file: {
      type: "file_upload",
      file_upload: { id: uploadId },
    },
  }
}

async function readUploadAsset(
  context: AssetContext | undefined,
  args: Record<string, unknown>
) {
  const [asset] = await readRunAssets(
    context,
    [
      {
        assetId: requiredString(args.assetId, "assetId"),
        name: optionalString(args.filename),
        mimeType: optionalString(args.contentType),
      },
    ],
    { maxBytes: maxSinglePartUploadBytes }
  )

  if (asset === undefined) {
    throw new Error("assetId is required")
  }

  validateFilename(asset.name)

  return asset
}

async function createFileUpload(token: string, asset: RunAsset) {
  return await notionJson(token, "POST", "/file_uploads", {
    mode: "single_part",
    filename: asset.name,
    content_type: asset.mimeType,
  })
}

async function sendFileUpload(
  token: string,
  uploadId: string,
  asset: RunAsset
) {
  const form = new FormData()

  form.set(
    "file",
    new Blob([copyBytesToArrayBuffer(asset.bytes)], {
      type: asset.mimeType,
    }),
    asset.name
  )

  return await notionMultipartJson(
    token,
    `/file_uploads/${encodeURIComponent(uploadId)}/send`,
    form
  )
}

function validateFilename(filename: string) {
  if (filename.trim() === "") {
    throw new Error("Notion upload filename is required")
  }

  if (new TextEncoder().encode(filename).byteLength > maxFilenameBytes) {
    throw new Error("Notion upload filename exceeds 900 bytes")
  }
}
