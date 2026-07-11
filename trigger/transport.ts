import { isRecord } from "../contracts/json"
import {
  assetUploadError,
  parseUploadedAsset,
  toArrayBuffer,
  type UploadedAsset,
} from "./assets"
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
