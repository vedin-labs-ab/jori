import { summarizePullRequest } from "../../../integrations/github/delivery/format"
import {
  optionalString,
  readRecord,
  requiredNumber,
  requiredString,
} from "../../../shared/input"
import { githubJsonObject, repositoryPath } from "./client"
import {
  commitSourceChangesToBranch,
  createBranchWithSourceChanges,
  type GitHubSourceCommit,
  normalizeBranchName,
  readSourceChanges,
} from "./source"

export async function commitToPullRequest(
  token: string,
  args: Record<string, unknown>
) {
  const owner = requiredString(args.owner, "owner")
  const repo = requiredString(args.repo, "repo")
  const pullNumber = requiredNumber(args.pullNumber, "pullNumber")
  const message = requiredString(args.commitMessage, "commitMessage")
  const changes = readSourceChanges(args.changes)

  if (changes.headSha === undefined) {
    throw new Error("changes.headSha is required for pull request commits")
  }

  const pullRequest = await getPullRequest(token, owner, repo, pullNumber)
  const branch = writablePullRequestBranch(pullRequest, {
    expectedSha: changes.headSha,
    owner,
    repo,
  })
  const commit = await commitSourceChangesToBranch(token, {
    branch,
    changes,
    message,
    owner,
    repo,
  })

  return {
    changes: {
      files: commit.files,
      headSha: changes.headSha,
    },
    commit: commitSummary(commit),
    pullRequest: summarizePullRequest(
      await getPullRequest(token, owner, repo, pullNumber)
    ),
  }
}

export async function createPullRequest(
  token: string,
  args: Record<string, unknown>
) {
  const owner = requiredString(args.owner, "owner")
  const repo = requiredString(args.repo, "repo")
  const title = requiredString(args.title, "title")
  const repository = await githubJsonObject(token, repositoryPath(owner, repo))
  const defaultBranch = requiredString(
    repository.default_branch,
    "default branch"
  )
  const base = normalizeBranchName(
    optionalString(args.base) ?? defaultBranch,
    "base"
  )
  const changes =
    args.changes === undefined ? undefined : readSourceChanges(args.changes)
  const commit =
    changes === undefined
      ? undefined
      : await createPullRequestCommit(token, {
          base,
          branch: normalizeBranchName(args.branch, "branch"),
          changes,
          defaultBranch,
          message: optionalString(args.commitMessage) ?? title,
          owner,
          repo,
        })
  const head =
    commit === undefined
      ? normalizeBranchName(args.head, "head")
      : normalizeBranchName(args.branch, "branch")

  return {
    ...(commit === undefined ? {} : { commit: commitSummary(commit) }),
    pullRequest: summarizePullRequest(
      await githubJsonObject(
        token,
        `${repositoryPath(owner, repo)}/pulls`,
        {},
        {
          method: "POST",
          body: createPullRequestBody(args, { base, head, title }),
        }
      )
    ),
  }
}

async function createPullRequestCommit(
  token: string,
  args: Parameters<typeof createBranchWithSourceChanges>[1] & {
    defaultBranch: string
  }
) {
  if (args.branch === args.base) {
    throw new Error("Pull request branch must differ from the base branch")
  }

  if (args.branch === args.defaultBranch) {
    throw new Error("Pull request branch must not be the default branch")
  }

  return await createBranchWithSourceChanges(token, args)
}

async function getPullRequest(
  token: string,
  owner: string,
  repo: string,
  pullNumber: number
) {
  return await githubJsonObject(
    token,
    `${repositoryPath(owner, repo)}/pulls/${pullNumber}`
  )
}

function writablePullRequestBranch(
  pullRequest: Record<string, unknown>,
  args: {
    expectedSha: string
    owner: string
    repo: string
  }
) {
  if (pullRequest.state !== "open") {
    throw new Error("Pull request must be open")
  }

  if (pullRequest.merged === true) {
    throw new Error("Pull request is already merged")
  }

  const head = readRecord(pullRequest.head)
  const base = readRecord(pullRequest.base)
  const baseRepo = readRecord(base.repo)
  const headRepo = readRecord(head.repo)
  const fullName = `${args.owner}/${args.repo}`
  const branch = requiredString(head.ref, "pull request head branch")
  const headSha = requiredString(head.sha, "pull request head SHA")

  if (headRepo.full_name !== fullName) {
    throw new Error("Pull request commits are limited to same-repository heads")
  }

  if (branch === base.ref) {
    throw new Error("Pull request head branch must not be the base branch")
  }

  if (branch === baseRepo.default_branch) {
    throw new Error("Pull request head branch must not be the default branch")
  }

  if (headSha !== args.expectedSha) {
    throw new Error(
      `Pull request branch moved: expected ${args.expectedSha}, found ${headSha}`
    )
  }

  return branch
}

function createPullRequestBody(
  args: Record<string, unknown>,
  values: { base: string; head: string; title: string }
) {
  const draft = optionalBoolean(args.draft)
  const maintainerCanModify = optionalBoolean(args.maintainerCanModify)

  return {
    base: values.base,
    ...(draft === undefined ? {} : { draft }),
    head: values.head,
    ...(maintainerCanModify === undefined
      ? {}
      : { maintainer_can_modify: maintainerCanModify }),
    title: values.title,
    ...(typeof args.body === "string" ? { body: args.body } : {}),
  }
}

function commitSummary(commit: GitHubSourceCommit) {
  return {
    ...(commit.baseSha === undefined ? {} : { baseSha: commit.baseSha }),
    files: commit.files,
    sha: commit.sha,
    treeSha: commit.treeSha,
  }
}

function optionalBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined
}
