import path from "node:path"
import { sandboxWorkspace } from "./sandbox/artifacts"
import { type ToolRuntime } from "./tool"
import { type ConvexId, type JsonObject } from "./types"

const maxAttachmentBytes = 25 * 1024 * 1024
const mimeTypesByExtension: Record<string, string> = {
  ".csv": "text/csv",
  ".gif": "image/gif",
  ".htm": "text/html",
  ".html": "text/html",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".json": "application/json",
  ".md": "text/plain",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".txt": "text/plain",
  ".webp": "image/webp",
}

export async function prepareMiloToolInput(
  runtime: ToolRuntime,
  tool: string,
  input: JsonObject
) {
  if (tool !== "create_artifact" && tool !== "update_artifact") {
    return input
  }

  const artifact = await runtime.sandbox.buildArtifact(
    requiredString(input.workspacePath, "workspacePath")
  )
  const { approval: _approval, workspacePath: _workspacePath, ...rest } = input

  return {
    ...rest,
    build: artifact.build,
    contract: artifact.contract,
    source: artifact.source,
  }
}

export async function saveSandboxAttachment(
  runtime: ToolRuntime,
  input: JsonObject
) {
  const filePath = sandboxFilePath(requiredString(input.path, "path"))
  const bytes = await runtime.sandbox.readFile(filePath)

  if (bytes.byteLength === 0) {
    throw new Error("Attachment is empty")
  }

  if (bytes.byteLength > maxAttachmentBytes) {
    throw new Error("Attachment exceeds the 25 MB limit")
  }

  return await runtime.convex.uploadAttachment({
    bytes,
    description: optionalString(input.description),
    mimeType: optionalString(input.mimeType) ?? inferMimeType(filePath),
    name: optionalString(input.name) ?? path.posix.basename(filePath),
    runId: runtime.context.run.id,
  })
}

export async function materializeSandboxResult(
  runtime: ToolRuntime,
  result: unknown
) {
  const clone = githubRepositoryClone(result)

  if (clone === undefined) {
    return result
  }

  const credentials = await runtime.convex.fetchGitHubCloneCredentials({
    owner: clone.owner,
    repo: clone.repo,
    runId: runtime.context.run.id,
  })

  return await runtime.sandbox.cloneRepository({
    ...credentials,
    directory: clone.directory,
    ref: clone.ref,
    repository: `${clone.owner}/${clone.repo}`,
  })
}

function sandboxFilePath(value: string) {
  const filePath = path.posix.isAbsolute(value)
    ? path.posix.normalize(value)
    : path.posix.resolve(sandboxWorkspace, value)
  const relative = path.posix.relative(sandboxWorkspace, filePath)

  if (
    relative === "" ||
    relative.startsWith("..") ||
    path.posix.isAbsolute(relative)
  ) {
    throw new Error("File path must be inside the Milo workspace")
  }

  return filePath
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

function inferMimeType(filePath: string) {
  return (
    mimeTypesByExtension[path.posix.extname(filePath).toLowerCase()] ??
    "application/octet-stream"
  )
}

export type UploadedAttachment = {
  attachmentId: ConvexId<"attachments">
  mimeType: string
  name: string
  size: number
  url: string | null
}

export function parseUploadedAttachment(value: unknown): UploadedAttachment {
  if (!isRecord(value)) {
    throw new Error("Attachment upload returned an invalid response.")
  }

  return {
    attachmentId: readString(
      value.attachmentId,
      "attachmentId"
    ) as ConvexId<"attachments">,
    mimeType: readString(value.mimeType, "mimeType"),
    name: readString(value.name, "name"),
    size: readNumber(value.size, "size"),
    url: value.url === null ? null : readString(value.url, "url"),
  }
}

function githubRepositoryClone(value: unknown) {
  if (!isRecord(value) || !isRecord(value.clone)) {
    return undefined
  }

  const clone = value.clone

  if (
    clone.kind !== "github_repository" ||
    typeof clone.owner !== "string" ||
    typeof clone.repo !== "string"
  ) {
    return undefined
  }

  return {
    directory:
      typeof clone.directory === "string" || clone.directory === null
        ? clone.directory
        : undefined,
    owner: clone.owner,
    ref: typeof clone.ref === "string" ? clone.ref : undefined,
    repo: clone.repo,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function readString(value: unknown, name: string) {
  if (typeof value !== "string") {
    throw new Error(`Attachment upload response is missing ${name}.`)
  }

  return value
}

function readNumber(value: unknown, name: string) {
  if (typeof value !== "number") {
    throw new Error(`Attachment upload response is missing ${name}.`)
  }

  return value
}
