import fs from "node:fs/promises"
import path from "node:path"
import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js"

type FileSaveContext = {
  codexHome: string
  convexSiteUrl: string
  executionToken: string
  workspace: string
}

type RecordValue = Record<string, unknown>

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

export async function saveFile(args: unknown, context: FileSaveContext) {
  if (!isRecord(args)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      "save_file arguments must be an object"
    )
  }

  const filePath = requiredString(args.path, "path")
  const resolvedPath = await resolveFilePath(filePath, context)
  const stat = await fs.stat(resolvedPath)

  if (!stat.isFile()) {
    throw new McpError(ErrorCode.InvalidParams, "Path must be a file")
  }

  if (stat.size <= 0) {
    throw new McpError(ErrorCode.InvalidParams, "File is empty")
  }

  if (stat.size > maxFileBytes) {
    throw new McpError(ErrorCode.InvalidParams, "File exceeds the 25 MB limit")
  }

  return await uploadFile(resolvedPath, args, context)
}

export async function resolveWorkspacePath(value: string, workspace: string) {
  const resolvedPath = await resolveExistingPath(
    value,
    workspace,
    "Workspace path"
  )
  const workspaceRoot = await resolveRoot(workspace)

  if (!isInsideDirectory(resolvedPath, workspaceRoot)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      "Workspace path must be inside the Milo workspace"
    )
  }

  const stat = await fs.stat(resolvedPath)

  if (!stat.isDirectory()) {
    throw new McpError(
      ErrorCode.InvalidParams,
      "Workspace path must be a directory"
    )
  }

  return resolvedPath
}

async function uploadFile(
  resolvedPath: string,
  args: RecordValue,
  context: FileSaveContext
) {
  const bytes = await fs.readFile(resolvedPath)
  const name = optionalString(args.name) ?? path.basename(resolvedPath)
  const mimeType = optionalString(args.mimeType) ?? inferMimeType(resolvedPath)
  const description = optionalString(args.description)
  const url = new URL("/milo/files", context.convexSiteUrl)

  url.searchParams.set("name", name)

  if (description !== undefined) {
    url.searchParams.set("description", description)
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      authorization: `Bearer ${context.executionToken}`,
      "content-type": mimeType,
    },
    body: bytes,
  })
  const result = await response.json().catch(() => null)

  if (!response.ok) {
    throw new McpError(
      ErrorCode.InternalError,
      responseErrorMessage(result, "File upload failed")
    )
  }

  return result
}

async function resolveFilePath(value: string, context: FileSaveContext) {
  const resolvedPath = await resolveExistingPath(
    value,
    context.workspace,
    "File path"
  )
  const generatedImagesDirectory = path.join(
    context.codexHome,
    "generated_images"
  )
  const roots = await Promise.all(
    [context.workspace, generatedImagesDirectory].map(resolveRoot)
  )

  if (!roots.some((root) => isInsideDirectory(resolvedPath, root))) {
    throw new McpError(
      ErrorCode.InvalidParams,
      "File path must be inside the workspace or generated image directory"
    )
  }

  return resolvedPath
}

async function resolveExistingPath(
  value: string,
  workspace: string,
  label: string
) {
  const candidate = path.isAbsolute(value)
    ? path.resolve(value)
    : path.resolve(workspace, value)

  try {
    return await fs.realpath(candidate)
  } catch {
    throw new McpError(ErrorCode.InvalidParams, `${label} does not exist`)
  }
}

async function resolveRoot(root: string) {
  try {
    return await fs.realpath(root)
  } catch {
    return path.resolve(root)
  }
}

function isInsideDirectory(filePath: string, directory: string) {
  const relative = path.relative(directory, filePath)

  return (
    relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative)
  )
}

function requiredString(value: unknown, name: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new McpError(ErrorCode.InvalidParams, `${name} is required`)
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
    mimeTypesByExtension[path.extname(filePath).toLowerCase()] ??
    "application/octet-stream"
  )
}

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function responseErrorMessage(value: unknown, fallback: string) {
  return isRecord(value) && typeof value.error === "string"
    ? value.error
    : fallback
}
