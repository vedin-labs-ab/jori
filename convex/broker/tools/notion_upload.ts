import {
  type AttachmentContext,
  type RunAttachment,
  readRunAttachments,
} from "../../attachments/read"
import { notionJson, notionMultipartJson } from "../../providers/notion/api"
import { optionalString, requiredString } from "../../shared/input"

const maxSinglePartUploadBytes = 20 * 1024 * 1024
const maxFilenameBytes = 900

export async function uploadNotionFile(
  token: string,
  args: Record<string, unknown>,
  context?: AttachmentContext
) {
  const attachment = await readUploadAttachment(context, args)
  const upload = await createFileUpload(token, attachment)
  const uploadId = requiredString(upload.id, "Notion file upload id")
  const sent = await sendFileUpload(token, uploadId, attachment)

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

async function readUploadAttachment(
  context: AttachmentContext | undefined,
  args: Record<string, unknown>
) {
  const [attachment] = await readRunAttachments(
    context,
    [
      {
        attachmentId: requiredString(args.attachmentId, "attachmentId"),
        name: optionalString(args.filename),
        mimeType: optionalString(args.contentType),
      },
    ],
    { maxBytes: maxSinglePartUploadBytes }
  )

  if (attachment === undefined) {
    throw new Error("attachmentId is required")
  }

  validateFilename(attachment.name)

  return attachment
}

async function createFileUpload(token: string, attachment: RunAttachment) {
  return await notionJson(token, "POST", "/file_uploads", {
    mode: "single_part",
    filename: attachment.name,
    content_type: attachment.mimeType,
  })
}

async function sendFileUpload(
  token: string,
  uploadId: string,
  attachment: RunAttachment
) {
  const form = new FormData()

  form.set(
    "file",
    new Blob([copyBytesToArrayBuffer(attachment.bytes)], {
      type: attachment.mimeType,
    }),
    attachment.name
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

function copyBytesToArrayBuffer(bytes: Uint8Array) {
  const buffer = new ArrayBuffer(bytes.byteLength)

  new Uint8Array(buffer).set(bytes)

  return buffer
}
