import { isRecord } from "../../contracts/json"
import { type RuntimeId } from "../../contracts/runtime/worker"
import { type GitHubCloneCredentials } from "../platform"
import { requireConvexSiteUrl } from "./config"
import { postWorkerEndpoint } from "./http"

export type GitHubCloneArgs = {
  owner: string
  repo: string
  runId: RuntimeId<"runs">
}

export async function fetchGitHubCloneCredentials(
  secret: string,
  args: GitHubCloneArgs
): Promise<GitHubCloneCredentials> {
  return parseGitHubCloneCredentials(
    await postWorkerEndpoint({
      body: JSON.stringify({ owner: args.owner, repo: args.repo }),
      contentType: "application/json",
      failure: "GitHub clone credentials request failed",
      runId: args.runId,
      secret,
      url: new URL("/milo/github/clone-credentials", requireConvexSiteUrl()),
    })
  )
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
