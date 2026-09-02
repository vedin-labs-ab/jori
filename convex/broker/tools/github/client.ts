import { githubRepositoryPath } from "../../../integrations/github/api"
import { requiredString } from "../../../shared/input"

export function encodeGitHubPath(value: string) {
  return value.split("/").map(encodeURIComponent).join("/")
}

export function repositoryPath(ownerValue: unknown, repoValue: unknown) {
  return githubRepositoryPath(
    requiredString(ownerValue, "owner"),
    requiredString(repoValue, "repo")
  )
}
