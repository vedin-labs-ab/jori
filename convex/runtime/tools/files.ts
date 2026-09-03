import path from "node:path"
import { type JsonObject } from "../../contracts/json"
import { fileTooLargeError, maxFileBytes } from "../../contracts/runtime/files"
import { optionalString, requiredString } from "../input"
import { type AgentRuntime } from "../runtime"
import { sandboxWorkspace } from "../sandbox/workspace"

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

export async function saveSandboxFile(
  runtime: AgentRuntime,
  input: JsonObject
) {
  const filePath = sandboxFilePath(requiredString(input.path, "path"))
  const bytes = await runtime.sandbox.readFile(filePath)

  if (bytes.byteLength === 0) {
    throw new Error("File is empty")
  }

  if (bytes.byteLength > maxFileBytes) {
    throw new Error(fileTooLargeError)
  }

  return await runtime.platform.uploadFile({
    bytes,
    mimeType: optionalString(input.mimeType) ?? inferMimeType(filePath),
    name: optionalString(input.name) ?? path.posix.basename(filePath),
    runId: runtime.context.run.id,
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
    throw new Error("File path must be inside the Jori workspace")
  }

  return filePath
}

function inferMimeType(filePath: string) {
  return (
    mimeTypesByExtension[path.posix.extname(filePath).toLowerCase()] ??
    "application/octet-stream"
  )
}
