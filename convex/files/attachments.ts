import { internal } from "../_generated/api"
import { type Doc, type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"

export type FileAttachment = {
  fileId: Id<"files">
  name: string
  mimeType: string
  size: number
  description?: string
  bytes: Uint8Array
}

export type FileContext = {
  ctx: ActionCtx
  execution: Doc<"executions">
}

export async function readFileAttachments(
  context: FileContext | undefined,
  value: unknown,
  options: { maxBytes?: number } = {}
): Promise<FileAttachment[]> {
  const inputs = readFileAttachmentInputs(value)

  if (inputs.length === 0) {
    return []
  }

  if (context === undefined) {
    throw new Error("File attachments are not available in this context")
  }

  const attachments: FileAttachment[] = []

  for (const input of inputs) {
    const file = await context.ctx.runQuery(internal.files.data.getForTenant, {
      tenantId: context.execution.tenantId,
      fileId: input.fileId as Id<"files">,
    })

    if (file === null) {
      throw new Error(`Unknown file: ${input.fileId}`)
    }

    if (options.maxBytes !== undefined && file.size > options.maxBytes) {
      throw new Error(
        `${file.name} exceeds the ${formatBytes(options.maxBytes)} attachment limit`
      )
    }

    const blob = await context.ctx.storage.get(file.storageId)

    if (blob === null) {
      throw new Error(`File is missing: ${file.name}`)
    }

    attachments.push({
      fileId: file._id,
      name: input.name ?? file.name,
      mimeType: input.mimeType ?? file.mimeType,
      size: file.size,
      description: file.description,
      bytes: new Uint8Array(await blob.arrayBuffer()),
    })
  }

  return attachments
}

function readFileAttachmentInputs(value: unknown) {
  if (value === undefined || value === null) {
    return []
  }

  if (!Array.isArray(value)) {
    throw new Error("attachments must be an array")
  }

  return value.map((item, index) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      throw new Error(`attachments[${index}] must be an object`)
    }

    const input = item as Record<string, unknown>
    const fileId = requiredString(input.fileId, `attachments[${index}].fileId`)

    return {
      fileId,
      name: optionalString(input.name),
      mimeType: optionalString(input.mimeType),
    }
  })
}

function requiredString(value: unknown, name: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${name} is required`)
  }

  return value.trim()
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : undefined
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.floor(bytes / 1024)} KB`
  }

  return `${Math.floor(bytes / (1024 * 1024))} MB`
}
