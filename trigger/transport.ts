import {
  assetUploadError,
  parseUploadedAsset,
  toArrayBuffer,
  type UploadedAsset,
} from "./assets"
import { fetchGitHubCloneCredentials as fetchGitHubCloneCredentialsHttp } from "./github"
import { type ConvexId } from "./types"

export type UploadAssetArgs = {
  bytes: Uint8Array
  description?: string
  mimeType: string
  name: string
  runId: ConvexId<"runs">
}

export type GitHubCloneArgs = {
  owner: string
  repo: string
  runId: ConvexId<"runs">
}

export function requireConvexUrl() {
  return requireEnv("CONVEX_URL", "VITE_CONVEX_URL")
}

function requireConvexSiteUrl() {
  return requireEnv("CONVEX_SITE_URL", "VITE_CONVEX_SITE_URL")
}

export function requireWorkerSecret() {
  return requireEnv("MILO_WORKER_SECRET")
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
    body: toArrayBuffer(args.bytes),
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

export async function fetchGitHubCloneCredentials(
  secret: string,
  args: GitHubCloneArgs
) {
  return await fetchGitHubCloneCredentialsHttp({
    ...args,
    secret,
    siteUrl: requireConvexSiteUrl(),
  })
}

function requireEnv(name: string, fallback?: string) {
  const value = process.env[name]?.trim() || process.env[fallback ?? ""]?.trim()

  if (value === undefined || value === "") {
    throw new Error(`Missing ${name}`)
  }

  return value
}
