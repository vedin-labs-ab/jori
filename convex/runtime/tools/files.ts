import { sandboxWorkspace } from "../../../contracts/coding"
import { type JsonObject } from "../../../contracts/json"
import {
  fileTooLargeError,
  maxFileBytes,
} from "../../../contracts/runtime/files"
import { type RuntimeId } from "../../../contracts/runtime/ids"
import { internal } from "../../_generated/api"
import { type Id } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"
import { normalizeFileName } from "../../files/names"
import { optionalString, requiredString } from "../../shared/input"
import { type AgentRuntime, type UploadedFile } from "../platform"
import {
  isAbsolutePosix,
  joinPosix,
  normalizePosix,
  relativePosix,
} from "../sandbox/path"

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
    name: optionalString(input.name) ?? baseName(filePath),
    runId: runtime.context.run.id,
  })
}

/**
 * Store the blob, then record the file row. The blob is deleted again when
 * the row fails, so a failed upload leaves nothing behind in storage.
 */
export async function uploadRunFile(
  ctx: ActionCtx,
  args: {
    bytes: Uint8Array
    mimeType: string
    name: string
    organizationId: string
    runId: Id<"runs">
  }
): Promise<UploadedFile> {
  const name = normalizeFileName(args.name)
  const storageId = await ctx.storage.store(
    new Blob([new Uint8Array(args.bytes)], { type: args.mimeType })
  )

  try {
    const fileId = await ctx.runMutation(internal.files.data.record, {
      mimeType: args.mimeType,
      name,
      organizationId: args.organizationId,
      runId: args.runId,
      size: args.bytes.byteLength,
      storageId,
      visibility: { mode: "organization" },
    })

    return {
      fileId: fileId as RuntimeId<"files">,
      mimeType: args.mimeType,
      name,
      size: args.bytes.byteLength,
      url: await ctx.storage.getUrl(storageId),
    }
  } catch (error) {
    await ctx.storage.delete(storageId)

    throw error
  }
}

function sandboxFilePath(value: string) {
  const filePath = isAbsolutePosix(value)
    ? normalizePosix(value)
    : joinPosix(sandboxWorkspace, value)
  const relative = relativePosix(sandboxWorkspace, filePath)

  if (relative === "" || relative.startsWith("..")) {
    throw new Error("File path must be inside the Jori workspace")
  }

  return filePath
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
