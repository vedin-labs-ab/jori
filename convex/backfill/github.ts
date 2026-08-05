import {
  issueLifecycleEvent,
  pullRequestLifecycleEvent,
} from "../../contracts/automations/events/names"
import { type Doc } from "../_generated/dataModel"
import { githubJson, githubJsonObject } from "../integrations/github/api"
import { requireGitHubRuntimeToken } from "../integrations/github/credentials"
import { createIntegrationActor } from "../shared/actor"
import { githubPageSize, maxRepositories } from "./limits"
import { type BackfillEvent, type BackfillPage } from "./page"

// The issues listing carries pull requests too, marked by a `pull_request`
// field, so one endpoint walks both. Items arrive as loose JSON; the reader
// mirrors the webhook payload types and drops anything without a number.
type IssueItem = {
  number?: number
  title?: string
  state?: string
  html_url?: string
  updated_at?: string
  user?: { id?: number; login?: string; type?: string }
  pull_request?: { merged_at?: string | null }
}

type RepositoryItem = {
  full_name?: string
  pushed_at?: string
}

export type GitHubCursor = {
  repositories: string[]
  repository: number
  page: number
}

export async function fetchGitHubBackfillPage(
  integration: Doc<"integrations">,
  cursor: GitHubCursor | undefined,
  window: { start: number; end: number }
): Promise<BackfillPage<GitHubCursor>> {
  const token = requireGitHubRuntimeToken(integration)
  const current = cursor ?? (await startCursor(token))

  if (current.repository >= current.repositories.length) {
    return { events: [], cursor: null }
  }

  const repository = current.repositories[current.repository]
  const items = (await githubJson(token, `/repos/${repository}/issues`, {
    state: "all",
    sort: "updated",
    direction: "desc",
    per_page: githubPageSize,
    page: current.page,
    since: new Date(window.start).toISOString(),
  })) as IssueItem[]

  const events = items
    .map((item) => readGitHubBackfillItem(repository, item))
    .filter((event): event is BackfillEvent => event !== null)
  const exhaustedRepository = items.length < githubPageSize
  const nextRepository = current.repository + 1

  return {
    events,
    cursor: exhaustedRepository
      ? nextRepository >= current.repositories.length
        ? null
        : { ...current, repository: nextRepository, page: 1 }
      : { ...current, page: current.page + 1 },
  }
}

// One page of installation repositories, most recently pushed first, capped:
// a large account backfills its active repositories, not its archive.
async function startCursor(token: string): Promise<GitHubCursor> {
  const listing = await githubJsonObject(token, "/installation/repositories", {
    per_page: 100,
  })
  const repositories = (
    Array.isArray(listing.repositories) ? listing.repositories : []
  ) as RepositoryItem[]
  const names = repositories
    .filter((repository) => typeof repository.full_name === "string")
    .sort(
      (left, right) =>
        Date.parse(right.pushed_at ?? "") - Date.parse(left.pushed_at ?? "")
    )
    .slice(0, maxRepositories)
    .map((repository) => repository.full_name as string)

  return { repositories: names, repository: 0, page: 1 }
}

// A snapshot event per item, typed with the lifecycle verb matching its
// current state, dated by the provider's own clock. Keys are content-derived
// so re-running a backfill collides with itself instead of duplicating.
export function readGitHubBackfillItem(
  repository: string,
  item: IssueItem
): BackfillEvent | null {
  const number = item.number
  const observedAt = Date.parse(item.updated_at ?? "")

  if (number === undefined || !Number.isFinite(observedAt)) {
    return null
  }

  const actor = createIntegrationActor({
    externalId: item.user?.id === undefined ? undefined : String(item.user.id),
    name: item.user?.login,
    kind: item.user?.type === "Bot" ? "bot" : "person",
  })
  const reference = { number, title: item.title, url: item.html_url }

  if (item.pull_request !== undefined) {
    const action =
      typeof item.pull_request.merged_at === "string"
        ? ("merged" as const)
        : item.state === "closed"
          ? ("closed" as const)
          : ("opened" as const)

    return {
      key: `github:backfill:${repository}#${number}`,
      type: pullRequestLifecycleEvent[action],
      text: `Pull request #${number} ${action} in ${repository}: ${item.title ?? ""}`.trim(),
      actor,
      data: {
        action,
        repository: { fullName: repository },
        pullNumber: number,
        isPullRequest: true,
        pullRequest: reference,
      },
      observedAt,
    }
  }

  const action =
    item.state === "closed" ? ("closed" as const) : ("opened" as const)

  return {
    key: `github:backfill:${repository}#${number}`,
    type: issueLifecycleEvent[action],
    text: `Issue #${number} ${action} in ${repository}: ${item.title ?? ""}`.trim(),
    actor,
    data: {
      action,
      repository: { fullName: repository },
      issueNumber: number,
      issue: reference,
    },
    observedAt,
  }
}
