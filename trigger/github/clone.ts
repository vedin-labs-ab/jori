import { isRecord } from "../../contracts/json"
import { type ToolRuntime } from "../tool/runtime"

export async function materializeSandboxResult(
  runtime: ToolRuntime,
  result: unknown
) {
  const clone = githubRepositoryClone(result)

  if (clone === undefined) {
    return result
  }

  const credentials = await runtime.convex.fetchGitHubCloneCredentials({
    owner: clone.owner,
    repo: clone.repo,
    runId: runtime.context.run.id,
  })

  return await runtime.sandbox.cloneRepository({
    ...credentials,
    directory: clone.directory,
    ref: clone.ref,
    repository: `${clone.owner}/${clone.repo}`,
  })
}

function githubRepositoryClone(value: unknown) {
  if (!isRecord(value) || !isRecord(value.clone)) {
    return undefined
  }

  const clone = value.clone

  if (
    clone.kind !== "github_repository" ||
    typeof clone.owner !== "string" ||
    typeof clone.repo !== "string"
  ) {
    return undefined
  }

  return {
    directory:
      typeof clone.directory === "string" || clone.directory === null
        ? clone.directory
        : undefined,
    owner: clone.owner,
    ref: typeof clone.ref === "string" ? clone.ref : undefined,
    repo: clone.repo,
  }
}
