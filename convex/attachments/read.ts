import { internal } from "../_generated/api"
import { type Doc, type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"

export type RunAttachment = {
  attachmentId: Id<"attachments">
  name: string
  mimeType: string
  size: number
  description?: string
  bytes: Uint8Array
}

export type AttachmentContext = {
  ctx: ActionCtx
  run: Doc<"runs">
}

export async function readRunAttachments(
  context: AttachmentContext | undefined,
  value: unknown,
  options: { maxBytes?: number } = {}
): Promise<RunAttachment[]> {
  const inputs = readAttachmentInputs(value)

  if (inputs.length === 0) {
    return []
  }

  if (context === undefined) {
    throw new Error("Attachments are not available in this context")
  }

  const attachments: RunAttachment[] = []

  for (const input of inputs) {
    const attachment = await context.ctx.runQuery(
      internal.attachments.data.getForTenant,
      {
        tenantId: context.run.tenantId,
        attachmentId: input.attachmentId as Id<"attachments">,
      }
    )

    if (attachment === null) {
      throw new Error(`Unknown attachment: ${input.attachmentId}`)
    }

    if (options.maxBytes !== undefined && attachment.size > options.maxBytes) {
      throw new Error(
        `${attachment.name} exceeds the ${formatBytes(options.maxBytes)} attachment limit`
      )
    }

    const blob = await context.ctx.storage.get(attachment.storageId)

    if (blob === null) {
      throw new Error(`Attachment is missing: ${attachment.name}`)
    }

    attachments.push({
      attachmentId: attachment._id,
      name: input.name ?? attachment.name,
      mimeType: input.mimeType ?? attachment.mimeType,
      size: attachment.size,
      description: attachment.description,
      bytes: new Uint8Array(await blob.arrayBuffer()),
    })
  }

  return attachments
}

function readAttachmentInputs(value: unknown) {
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
    const attachmentId = requiredString(
      input.attachmentId,
      `attachments[${index}].attachmentId`
    )

    return {
      attachmentId,
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
