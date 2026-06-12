import { internal } from "../_generated/api"
import { type Doc, type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"

export type ArtifactAttachment = {
  artifactId: Id<"artifacts">
  name: string
  mimeType: string
  size: number
  description?: string
  bytes: Uint8Array
}

export type ArtifactContext = {
  ctx: ActionCtx
  execution: Doc<"executions">
}

export async function readArtifactAttachments(
  context: ArtifactContext | undefined,
  value: unknown,
  options: { maxBytes?: number } = {}
): Promise<ArtifactAttachment[]> {
  const inputs = readArtifactAttachmentInputs(value)

  if (inputs.length === 0) {
    return []
  }

  if (context === undefined) {
    throw new Error("Artifact attachments are not available in this context")
  }

  const attachments: ArtifactAttachment[] = []

  for (const input of inputs) {
    const artifact = await context.ctx.runQuery(
      internal.artifacts.data.getForTenant,
      {
        tenantId: context.execution.tenantId,
        artifactId: input.artifactId as Id<"artifacts">,
      }
    )

    if (artifact === null) {
      throw new Error(`Unknown artifact: ${input.artifactId}`)
    }

    if (options.maxBytes !== undefined && artifact.size > options.maxBytes) {
      throw new Error(
        `${artifact.name} exceeds the ${formatBytes(options.maxBytes)} attachment limit`
      )
    }

    const blob = await context.ctx.storage.get(artifact.storageId)

    if (blob === null) {
      throw new Error(`Artifact file is missing: ${artifact.name}`)
    }

    attachments.push({
      artifactId: artifact._id,
      name: input.name ?? artifact.name,
      mimeType: input.mimeType ?? artifact.mimeType,
      size: artifact.size,
      description: artifact.description,
      bytes: new Uint8Array(await blob.arrayBuffer()),
    })
  }

  return attachments
}

function readArtifactAttachmentInputs(value: unknown) {
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
    const artifactId = requiredString(
      input.artifactId,
      `attachments[${index}].artifactId`
    )

    return {
      artifactId,
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
