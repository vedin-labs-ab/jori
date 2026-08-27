import { isRecord } from "../../contracts/json"
import { type RuntimeId } from "../../contracts/runtime/worker"
import { type UploadedFile } from "../platform"
import { requireConvexSiteUrl } from "./config"
import { postWorkerEndpoint } from "./http"

export type UploadFileArgs = {
  bytes: Uint8Array
  description?: string
  mimeType: string
  name: string
  runId: RuntimeId<"runs">
}

export async function uploadFile(
  secret: string,
  args: UploadFileArgs
): Promise<UploadedFile> {
  const url = new URL("/jori/files", requireConvexSiteUrl())
  url.searchParams.set("name", args.name)

  if (args.description !== undefined) {
    url.searchParams.set("description", args.description)
  }

  return parseUploadedFile(
    await postWorkerEndpoint({
      body: new Uint8Array(args.bytes).buffer,
      contentType: args.mimeType,
      failure: "File upload failed",
      runId: args.runId,
      secret,
      url,
    })
  )
}

function parseUploadedFile(value: unknown): UploadedFile {
  if (!isRecord(value)) {
    throw new Error("File upload returned an invalid response.")
  }

  return {
    fileId: readUploadValue(value.fileId, "fileId") as RuntimeId<"files">,
    mimeType: readUploadValue(value.mimeType, "mimeType"),
    name: readUploadValue(value.name, "name"),
    size: readUploadSize(value.size),
    url: value.url === null ? null : readUploadValue(value.url, "url"),
  }
}

function readUploadValue(value: unknown, name: string) {
  if (typeof value !== "string") {
    throw new Error(`File upload response is missing ${name}.`)
  }

  return value
}

function readUploadSize(value: unknown) {
  if (typeof value !== "number") {
    throw new Error("File upload response is missing size.")
  }

  return value
}
