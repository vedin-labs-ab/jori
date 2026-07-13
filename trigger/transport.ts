import { isRecord } from "../contracts/json"
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

type GitHubCloneCredentials = {
  remoteUrl: string
  token: string
  username: string
}

type UploadedAsset = {
  assetId: ConvexId<"assets">
  mimeType: string
  name: string
  size: number
  url: string | null
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

export async function fetchGitHubCloneCredentials(
  secret: string,
  args: GitHubCloneArgs
): Promise<GitHubCloneCredentials> {
  const response = await fetch(
    new URL("/milo/github/clone-credentials", requireConvexSiteUrl()),
    {
      body: JSON.stringify({ owner: args.owner, repo: args.repo }),
      headers: {
        "content-type": "application/json",
        "x-milo-run-id": args.runId,
        "x-milo-worker-secret": secret,
      },
      method: "POST",
    }
  )
  const result = (await response.json().catch(() => null)) as unknown

  if (!response.ok) {
    throw new Error(gitHubCloneCredentialsError(result))
  }

  return parseGitHubCloneCredentials(result)
}

function requireEnv(name: string, fallback?: string) {
  const value = process.env[name]?.trim() || process.env[fallback ?? ""]?.trim()

  if (value === undefined || value === "") {
    throw new Error(`Missing ${name}`)
  }

  return value
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
    assetId: readUploadValue(value.assetId, "assetId") as ConvexId<"assets">,
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

function gitHubCloneCredentialsError(value: unknown) {
  return isRecord(value) && typeof value.error === "string"
    ? value.error
    : "GitHub clone credentials request failed"
}

function parseGitHubCloneCredentials(value: unknown) {
  if (!isRecord(value)) {
    throw new Error("GitHub clone credentials response is invalid")
  }

  return {
    remoteUrl: readCredential(value.remoteUrl, "remoteUrl"),
    token: readCredential(value.token, "token"),
    username: readCredential(value.username, "username"),
  }
}

function readCredential(value: unknown, name: string) {
  if (typeof value !== "string" || value === "") {
    throw new Error(`GitHub clone credentials response is missing ${name}`)
  }

  return value
}
