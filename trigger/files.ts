import path from "node:path"
import { sandboxWorkspace } from "./sandbox/artifacts"
import { type ToolRuntime } from "./tool"
import { type ConvexId, type JsonObject } from "./types"

const maxFileBytes = 25 * 1024 * 1024
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

export async function saveSandboxFile(runtime: ToolRuntime, input: JsonObject) {
  const filePath = sandboxFilePath(requiredString(input.path, "path"))
  const bytes = await runtime.sandbox.readFile(filePath)

  if (bytes.byteLength === 0) {
    throw new Error("File is empty")
  }

  if (bytes.byteLength > maxFileBytes) {
    throw new Error("File exceeds the 25 MB limit")
  }

  return await runtime.convex.uploadFile({
    bytes,
    description: optionalString(input.description),
    executionId: runtime.context.execution.id,
    mimeType: optionalString(input.mimeType) ?? inferMimeType(filePath),
    name: optionalString(input.name) ?? path.posix.basename(filePath),
  })
}

export async function materializeSandboxResult(
  runtime: ToolRuntime,
  result: unknown
) {
  const download = githubTarballDownload(result)

  if (download === undefined) {
    return result
  }

  const bytes = await runtime.convex.fetchGitHubTarball({
    executionId: runtime.context.execution.id,
    owner: download.owner,
    ref: download.ref,
    repo: download.repo,
  })

  return await runtime.sandbox.extractTarball({
    bytes,
    directory: download.directory,
    repository: `${download.owner}/${download.repo}`,
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

export type UploadedFile = {
  fileId: ConvexId<"files">
  mimeType: string
  name: string
  size: number
  url: string | null
}

function githubTarballDownload(value: unknown) {
  if (!isRecord(value) || !isRecord(value.download)) {
    return undefined
  }

  const download = value.download

  if (
    download.kind !== "github_tarball" ||
    typeof download.owner !== "string" ||
    typeof download.repo !== "string"
  ) {
    return undefined
  }

  return {
    directory:
      typeof download.directory === "string" || download.directory === null
        ? download.directory
        : undefined,
    owner: download.owner,
    ref: typeof download.ref === "string" ? download.ref : undefined,
    repo: download.repo,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
