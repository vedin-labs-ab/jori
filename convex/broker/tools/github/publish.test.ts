import { afterEach, expect, test, vi } from "vitest"
import { id } from "../../../../test/convex/database"
import { integrationDoc } from "../../../../test/convex/integrations"
import { type Doc } from "../../../_generated/dataModel"
import { callGitHubTool } from "./index"

const headSha = "a".repeat(40)
const treeSha = "b".repeat(40)
const newTreeSha = "c".repeat(40)
const commitSha = "d".repeat(40)

afterEach(() => {
  vi.unstubAllGlobals()
})

test("commits local source changes to a pull request without forcing the ref", async () => {
  const fetchMock = stubGitHubResponses([
    pullRequestPayload({ headSha }),
    { object: { sha: headSha } },
    { tree: { sha: treeSha } },
    { sha: newTreeSha },
    { sha: commitSha },
    { object: { sha: commitSha } },
    pullRequestPayload({ headSha: commitSha }),
  ])

  const result = await callGitHubTool(
    githubIntegration(),
    "github_commit_to_pull_request",
    {
      changes: sourceChanges({ headSha }),
      commitMessage: "Replace console references",
      owner: "acme",
      pullNumber: 12,
      repo: "app",
    }
  )

  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
    "https://api.github.com/repos/acme/app/pulls/12",
    "https://api.github.com/repos/acme/app/git/ref/heads/task/fix",
    `https://api.github.com/repos/acme/app/git/commits/${headSha}`,
    "https://api.github.com/repos/acme/app/git/trees",
    "https://api.github.com/repos/acme/app/git/commits",
    "https://api.github.com/repos/acme/app/git/refs/heads/task/fix",
    "https://api.github.com/repos/acme/app/pulls/12",
  ])
  expect(jsonBody(fetchMock, 3)).toEqual({
    base_tree: treeSha,
    tree: expect.arrayContaining([
      {
        content: "website\n",
        mode: "100644",
        path: "PRODUCT.md",
        type: "blob",
      },
      { mode: "100644", path: "old.txt", sha: null, type: "blob" },
    ]),
  })
  expect(jsonBody(fetchMock, 5)).toEqual({ force: false, sha: commitSha })
  expect(result).toMatchObject({
    changes: { files: 2, headSha },
    commit: { files: 2, sha: commitSha, treeSha: newTreeSha },
    pullRequest: { number: 12 },
  })
})

test("creates a pull request branch from local source changes", async () => {
  const fetchMock = stubGitHubResponses([
    { default_branch: "main" },
    { object: { sha: headSha } },
    { tree: { sha: treeSha } },
    { sha: newTreeSha },
    { sha: commitSha },
    { ref: "refs/heads/jori/fix" },
    pullRequestPayload({ headRef: "jori/fix", headSha: commitSha }),
  ])

  const result = await callGitHubTool(
    githubIntegration(),
    "github_create_pull_request",
    {
      branch: "jori/fix",
      changes: sourceChanges(),
      owner: "acme",
      repo: "app",
      title: "Replace console references",
    }
  )

  expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
    "https://api.github.com/repos/acme/app",
    "https://api.github.com/repos/acme/app/git/ref/heads/main",
    `https://api.github.com/repos/acme/app/git/commits/${headSha}`,
    "https://api.github.com/repos/acme/app/git/trees",
    "https://api.github.com/repos/acme/app/git/commits",
    "https://api.github.com/repos/acme/app/git/refs",
    "https://api.github.com/repos/acme/app/pulls",
  ])
  expect(jsonBody(fetchMock, 5)).toEqual({
    ref: "refs/heads/jori/fix",
    sha: commitSha,
  })
  expect(jsonBody(fetchMock, 6)).toEqual({
    base: "main",
    head: "jori/fix",
    title: "Replace console references",
  })
  expect(result).toMatchObject({
    commit: { baseSha: headSha, files: 2, sha: commitSha, treeSha: newTreeSha },
    pullRequest: { number: 12 },
  })
})

function sourceChanges(options: { headSha?: string } = {}) {
  return {
    files: [
      { content: "website\n", operation: "upsert", path: "PRODUCT.md" },
      { operation: "delete", path: "old.txt" },
    ],
    ...(options.headSha === undefined ? {} : { headSha: options.headSha }),
  }
}

function pullRequestPayload(
  options: { headRef?: string; headSha?: string } = {}
) {
  return {
    id: 100,
    number: 12,
    title: "Replace console references",
    state: "open",
    draft: false,
    merged: false,
    html_url: "https://github.com/acme/app/pull/12",
    base: {
      ref: "main",
      repo: { default_branch: "main", full_name: "acme/app" },
    },
    head: {
      ref: options.headRef ?? "task/fix",
      repo: { full_name: "acme/app" },
      sha: options.headSha ?? headSha,
    },
  }
}

function stubGitHubResponses(responses: unknown[]) {
  const fetchMock = vi.fn(
    async (_url: string | URL | Request, _options?: RequestInit) => {
      const response = responses.shift()

      return Response.json(response ?? { message: "Unexpected request" }, {
        status: response === undefined ? 500 : 200,
      })
    }
  )

  vi.stubGlobal("fetch", fetchMock)
  return fetchMock
}

function githubIntegration(): Doc<"integrations"> {
  return integrationDoc({
    _id: id<"integrations">("github-integration"),
    integration: "github",
    externalId: "github-account",
    credentials: {
      installationId: "123",
      tokens: { access: "github-token" },
    },
  })
}

function jsonBody(
  fetchMock: ReturnType<typeof stubGitHubResponses>,
  index: number
) {
  return JSON.parse(String(fetchMock.mock.calls[index]?.[1]?.body))
}
