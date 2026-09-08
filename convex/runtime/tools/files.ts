import { type JsonObject } from "../../../contracts/json"
import { optionalString, requiredString } from "../../shared/input"
import { type AgentRuntime } from "../platform"
import { sandboxFilePath } from "../sandbox/path"

const mimeTypesByExtension: Record<string, string> = {
  csv: "text/csv",
  gif: "image/gif",
  htm: "text/html",
  html: "text/html",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  json: "application/json",
  md: "text/plain",
  pdf: "application/pdf",
  png: "image/png",
  txt: "text/plain",
  webp: "image/webp",
}

export async function saveSandboxFile(
  runtime: AgentRuntime,
  input: JsonObject
) {
  const filePath = sandboxFilePath(requiredString(input.path, "path"))
  return await runtime.sandbox.exportFile({
    path: filePath,
    mimeType: optionalString(input.mimeType) ?? inferMimeType(filePath),
    name: optionalString(input.name) ?? baseName(filePath),
  })
}

function baseName(filePath: string) {
  return filePath.split("/").at(-1) ?? filePath
}

function inferMimeType(filePath: string) {
  const name = baseName(filePath)
  const extension = name.includes(".")
    ? (name.split(".").at(-1)?.toLowerCase() ?? "")
    : ""

  return mimeTypesByExtension[extension] ?? "application/octet-stream"
}
