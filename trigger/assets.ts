import path from "node:path"
import { isArtifactPublishTool } from "../contracts/artifacts/publish"
import { isRecord } from "../contracts/json"
import {
  assetTooLargeError,
  maxAssetBytes,
  sandboxWorkspace,
} from "../contracts/runtime"
import { optionalString, requiredString } from "./input"
import { type ToolRuntime } from "./tool"
import { type ConvexId, type JsonObject } from "./types"

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
  if (!isArtifactPublishTool(tool)) {
    return input
  }

  const artifact = await runtime.sandbox.buildArtifact(
    requiredString(input.workspacePath, "workspacePath")
  )
  const {
    approval: _approval,
    final: _final,
    workspacePath: _workspacePath,
    ...rest
  } = input

  return {
    ...rest,
    build: artifact.build,
    contract: artifact.contract,
    source: artifact.source,
  }
}

export async function saveSandboxAsset(
  runtime: ToolRuntime,
  input: JsonObject
) {
  const filePath = sandboxFilePath(requiredString(input.path, "path"))
  const bytes = await runtime.sandbox.readFile(filePath)

  if (bytes.byteLength === 0) {
    throw new Error("Asset is empty")
  }

  if (bytes.byteLength > maxAssetBytes) {
    throw new Error(assetTooLargeError)
  }

  return await runtime.convex.uploadAsset({
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

function inferMimeType(filePath: string) {
  return (
    mimeTypesByExtension[path.posix.extname(filePath).toLowerCase()] ??
    "application/octet-stream"
  )
}

export type UploadedAsset = {
  assetId: ConvexId<"assets">
  mimeType: string
  name: string
  size: number
  url: string | null
}

export function parseUploadedAsset(value: unknown): UploadedAsset {
  if (!isRecord(value)) {
    throw new Error("Asset upload returned an invalid response.")
  }

  return {
    assetId: readString(value.assetId, "assetId") as ConvexId<"assets">,
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

export function assetUploadError(value: unknown) {
  if (isRecord(value) && typeof value.error === "string") {
    return value.error
  }

  return "Asset upload failed"
}

function readString(value: unknown, name: string) {
  if (typeof value !== "string") {
    throw new Error(`Asset upload response is missing ${name}.`)
  }

  return value
}

function readNumber(value: unknown, name: string) {
  if (typeof value !== "number") {
    throw new Error(`Asset upload response is missing ${name}.`)
  }

  return value
}
