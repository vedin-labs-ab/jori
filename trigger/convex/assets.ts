import { isRecord } from "../../contracts/json"
import { type RuntimeId } from "../../contracts/runtime/worker"
import { type UploadedAsset } from "../platform"
import { requireConvexSiteUrl } from "./config"
import { postWorkerEndpoint } from "./http"

export type UploadAssetArgs = {
  bytes: Uint8Array
  description?: string
  mimeType: string
  name: string
  runId: RuntimeId<"runs">
}

export async function uploadAsset(
  secret: string,
  args: UploadAssetArgs
): Promise<UploadedAsset> {
  const url = new URL("/jori/assets", requireConvexSiteUrl())
  url.searchParams.set("name", args.name)

  if (args.description !== undefined) {
    url.searchParams.set("description", args.description)
  }

  return parseUploadedAsset(
    await postWorkerEndpoint({
      body: new Uint8Array(args.bytes).buffer,
      contentType: args.mimeType,
      failure: "Asset upload failed",
      runId: args.runId,
      secret,
      url,
    })
  )
}

function parseUploadedAsset(value: unknown): UploadedAsset {
  if (!isRecord(value)) {
    throw new Error("Asset upload returned an invalid response.")
  }

  return {
    assetId: readUploadValue(value.assetId, "assetId") as RuntimeId<"assets">,
    mimeType: readUploadValue(value.mimeType, "mimeType"),
    name: readUploadValue(value.name, "name"),
    size: readUploadSize(value.size),
    url: value.url === null ? null : readUploadValue(value.url, "url"),
  }
}

function readUploadValue(value: unknown, name: string) {
  if (typeof value !== "string") {
    throw new Error(`Asset upload response is missing ${name}.`)
  }

  return value
}

function readUploadSize(value: unknown) {
  if (typeof value !== "number") {
    throw new Error("Asset upload response is missing size.")
  }

  return value
}
