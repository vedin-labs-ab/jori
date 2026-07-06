import { isRecord } from "../contracts/json"
import { type ConvexId } from "./types"

export type GitHubCloneCredentials = {
  remoteUrl: string
  token: string
  username: string
}

export async function fetchGitHubCloneCredentials(args: {
  owner: string
  repo: string
  runId: ConvexId<"runs">
  secret: string
  siteUrl: string
}): Promise<GitHubCloneCredentials> {
  const response = await fetch(
    new URL("/milo/github/clone-credentials", args.siteUrl),
    {
      body: JSON.stringify({
        owner: args.owner,
        repo: args.repo,
      }),
      headers: {
        "content-type": "application/json",
        "x-milo-run-id": args.runId,
        "x-milo-worker-secret": args.secret,
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
    remoteUrl: readString(value.remoteUrl, "remoteUrl"),
    token: readString(value.token, "token"),
    username: readString(value.username, "username"),
  }
}

function readString(value: unknown, name: string) {
  if (typeof value !== "string" || value === "") {
    throw new Error(`GitHub clone credentials response is missing ${name}`)
  }

  return value
}
