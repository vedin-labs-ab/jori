import { internal } from "../_generated/api"
import { type Doc, type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { executionPrincipalPersonId } from "../runs/principal"
import { optionalString, requiredString } from "../shared/input"

export type FileAttachment = {
  fileId: Id<"files">
  name: string
  mimeType: string
  size: number
  bytes: Uint8Array
}

export type AttachmentContext = {
  ctx: ActionCtx
  run: Doc<"runs">
}

export async function readAttachments(
  context: AttachmentContext | undefined,
  value: unknown,
  options: { maxBytes?: number } = {}
): Promise<FileAttachment[]> {
  const inputs = readAttachmentInputs(value)

  if (inputs.length === 0) {
    return []
  }

  if (context === undefined) {
    throw new Error("Files are not available in this context")
  }

  const attachments: FileAttachment[] = []

  for (const input of inputs) {
    attachments.push(await readAttachment(context, input, options))
  }

  return attachments
}

async function readAttachment(
  context: AttachmentContext,
  input: ReturnType<typeof readAttachmentInputs>[number],
  options: { maxBytes?: number }
): Promise<FileAttachment> {
  const file = await context.ctx.runQuery(internal.files.data.getVisible, {
    organizationId: context.run.organizationId,
    runId: context.run._id,
    personId: executionPrincipalPersonId(context.run.principal),
    fileId: input.fileId as Id<"files">,
  })

  if (file === null) {
    throw new Error(`Unknown file: ${input.fileId}`)
  }

  if (options.maxBytes !== undefined && file.size > options.maxBytes) {
    throw new Error(
      `${file.name} exceeds the ${formatBytes(options.maxBytes)} file limit`
    )
  }

  const blob = await context.ctx.storage.get(file.storageId)

  if (blob === null) {
    throw new Error(`File is missing: ${file.name}`)
  }

  return {
    fileId: file._id,
    name: input.name ?? file.name,
    mimeType: input.mimeType ?? file.mimeType,
    size: file.size,
    bytes: new Uint8Array(await blob.arrayBuffer()),
  }
}

function readAttachmentInputs(value: unknown) {
  if (value === undefined || value === null) {
    return []
  }

  if (!Array.isArray(value)) {
    throw new Error("files must be an array")
  }

  return value.map((item, index) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      throw new Error(`files[${index}] must be an object`)
    }

    const input = item as Record<string, unknown>
    const fileId = requiredString(input.fileId, `files[${index}].fileId`)

    return {
      fileId,
      name: optionalString(input.name),
      mimeType: optionalString(input.mimeType),
    }
  })
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.floor(bytes / 1024)} KB`
  }

  return `${Math.floor(bytes / (1024 * 1024))} MB`
}
