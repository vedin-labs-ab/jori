import {
  normalizeSourceChanges,
  type SourceChanges,
  type SourceFileChange,
} from "../../../../contracts/source"
import { readRecord } from "../../../shared/input"
import { githubJsonObject, repositoryPath } from "./client"

export type GitHubSourceCommit = {
  baseSha?: string
  files: number
  sha: string
  treeSha: string
}

export function readSourceChanges(value: unknown) {
  return normalizeSourceChanges(value)
}

export async function commitSourceChangesToBranch(
  token: string,
  args: {
    branch: string
    changes: SourceChanges
    message: string
    owner: string
    repo: string
  }
): Promise<GitHubSourceCommit> {
  const branch = normalizeBranchName(args.branch, "branch")
  const headSha = args.changes.headSha
  const ref = await readBranchRef(token, args.owner, args.repo, branch)

  if (headSha !== undefined && ref.sha !== headSha) {
    throw new Error(
      `Pull request branch moved: expected ${headSha}, found ${ref.sha}`
    )
  }

  const commit = await createSourceCommit(token, {
    changes: args.changes,
    message: args.message,
    owner: args.owner,
    parentSha: ref.sha,
    repo: args.repo,
  })

  await githubJsonObject(
    token,
    `${repositoryPath(args.owner, args.repo)}/git/refs/heads/${encodeGitRef(branch)}`,
    {},
    {
      method: "PATCH",
      body: {
        force: false,
        sha: commit.sha,
      },
    }
  )

  return commit
}

export async function createBranchWithSourceChanges(
  token: string,
  args: {
    base: string
    branch: string
    changes: SourceChanges
    message: string
    owner: string
    repo: string
  }
): Promise<GitHubSourceCommit> {
  const base = normalizeBranchName(args.base, "base")
  const branch = normalizeBranchName(args.branch, "branch")
  const ref = await readBranchRef(token, args.owner, args.repo, base)
  const commit = await createSourceCommit(token, {
    changes: args.changes,
    message: args.message,
    owner: args.owner,
    parentSha: ref.sha,
    repo: args.repo,
  })

  await githubJsonObject(
    token,
    `${repositoryPath(args.owner, args.repo)}/git/refs`,
    {},
    {
      method: "POST",
      body: {
        ref: `refs/heads/${branch}`,
        sha: commit.sha,
      },
    }
  )

  return {
    ...commit,
    baseSha: ref.sha,
  }
}

export function normalizeBranchName(value: unknown, name: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${name} is required`)
  }

  const branch = value.trim()

  if (
    branch.startsWith("/") ||
    branch.endsWith("/") ||
    branch.startsWith("refs/") ||
    branch.includes("..") ||
    branch.includes("@{") ||
    branch.includes("//") ||
    branch.endsWith(".") ||
    branch.endsWith(".lock") ||
    !/^[A-Za-z0-9._/-]+$/.test(branch)
  ) {
    throw new Error(`${name} is not a safe branch name`)
  }

  return branch
}

async function createSourceCommit(
  token: string,
  args: {
    changes: SourceChanges
    message: string
    owner: string
    parentSha: string
    repo: string
  }
): Promise<GitHubSourceCommit> {
  const parent = await readCommit(token, args.owner, args.repo, args.parentSha)
  const tree = await githubJsonObject(
    token,
    `${repositoryPath(args.owner, args.repo)}/git/trees`,
    {},
    {
      method: "POST",
      body: {
        base_tree: parent.treeSha,
        tree: args.changes.files.map(treeEntry),
      },
    }
  )
  const treeSha = readSha(tree.sha, "tree SHA")
  const commit = await githubJsonObject(
    token,
    `${repositoryPath(args.owner, args.repo)}/git/commits`,
    {},
    {
      method: "POST",
      body: {
        message: args.message,
        parents: [args.parentSha],
        tree: treeSha,
      },
    }
  )

  return {
    files: args.changes.files.length,
    sha: readSha(commit.sha, "commit SHA"),
    treeSha,
  }
}

function treeEntry(file: SourceFileChange) {
  if (file.operation === "delete") {
    return {
      mode: "100644",
      path: file.path,
      sha: null,
      type: "blob",
    }
  }

  return {
    content: file.content,
    mode: file.executable === true ? "100755" : "100644",
    path: file.path,
    type: "blob",
  }
}

async function readBranchRef(
  token: string,
  owner: string,
  repo: string,
  branch: string
) {
  const ref = await githubJsonObject(
    token,
    `${repositoryPath(owner, repo)}/git/ref/heads/${encodeGitRef(branch)}`
  )

  return {
    sha: readSha(readRecord(ref.object).sha, "branch SHA"),
  }
}

async function readCommit(
  token: string,
  owner: string,
  repo: string,
  sha: string
) {
  const commit = await githubJsonObject(
    token,
    `${repositoryPath(owner, repo)}/git/commits/${encodeURIComponent(sha)}`
  )

  return {
    treeSha: readSha(readRecord(commit.tree).sha, "commit tree SHA"),
  }
}

function encodeGitRef(value: string) {
  return value.split("/").map(encodeURIComponent).join("/")
}

function readSha(value: unknown, name: string) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Missing ${name}`)
  }

  return value
}
