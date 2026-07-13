import { isRecord } from "../../contracts/json"
import { type RuntimeId } from "../../contracts/runtime/worker"
import { type UploadedAsset } from "../platform"
import { requireConvexSiteUrl } from "./config"

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
  const url = new URL("/milo/assets", requireConvexSiteUrl())
  url.searchParams.set("name", args.name)

  if (args.description !== undefined) {
    url.searchParams.set("description", args.description)
  }

  const response = await fetch(url, {
    body: new Uint8Array(args.bytes).buffer,
    headers: {
      "content-type": args.mimeType,
      "x-milo-run-id": args.runId,
      "x-milo-worker-secret": secret,
    },
    method: "POST",
  })
  const result = (await response.json().catch(() => null)) as unknown

  if (!response.ok) {
    throw new Error(assetUploadError(result))
  }

  return parseUploadedAsset(result)
}

function assetUploadError(value: unknown) {
  return isRecord(value) && typeof value.error === "string"
    ? value.error
    : "Asset upload failed"
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
