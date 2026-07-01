import {
  githubJson,
  githubJsonObject,
  githubRepositoryPath,
} from "../../../providers/github/api"
import { requireGitHubRuntimeToken } from "../../../providers/github/credentials"
import { requiredString } from "../../../shared/input"

export { githubJson, githubJsonObject, requireGitHubRuntimeToken }

export function repositoryPath(ownerValue: unknown, repoValue: unknown) {
  return githubRepositoryPath(
    requiredString(ownerValue, "owner"),
    requiredString(repoValue, "repo")
  )
}
