import { isRecord } from "../../contracts/json"
import { type GitHubCloneCredentials } from "../platform"
import { type ConvexId } from "../types"
import { requireConvexSiteUrl } from "./config"

export type GitHubCloneArgs = {
  owner: string
  repo: string
  runId: ConvexId<"runs">
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
