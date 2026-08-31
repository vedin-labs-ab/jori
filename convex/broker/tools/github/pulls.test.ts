import { afterEach, expect, test, vi } from "vitest"
import { encodeToolResult } from "../../../../contracts/json"
import { id } from "../../../../test/convex/database"
import { integrationDoc } from "../../../../test/convex/integrations"
import { type Doc } from "../../../_generated/dataModel"
import { callGitHubTool } from "./index"

afterEach(() => {
  vi.unstubAllGlobals()
})

test("lists pull request files with pagination", async () => {
  const fetchMock = stubGitHubResponses([
    [
      {
        additions: 2,
        blob_url: "https://github.com/acme/app/blob/main/PRODUCT.md",
        changes: 3,
        deletions: 1,
        filename: "PRODUCT.md",
        raw_url: "https://github.com/acme/app/raw/main/PRODUCT.md",
        sha: "file-sha",
        status: "modified",
      },
    ],
  ])

  const result = await callGitHubTool(
    githubIntegration(),
    "github_list_pull_request_files",
    {
      owner: "acme",
      page: 2,
      perPage: 50,
      pullNumber: 12,
      repo: "app",
    }
  )

  expect(fetchMock.mock.calls[0]?.[0]).toBe(
    "https://api.github.com/repos/acme/app/pulls/12/files?page=2&per_page=50"
  )
  expect(result).toEqual({
    files: [
      {
        additions: 2,
        blobUrl: "https://github.com/acme/app/blob/main/PRODUCT.md",
        changes: 3,
        deletions: 1,
        filename: "PRODUCT.md",
        rawUrl: "https://github.com/acme/app/raw/main/PRODUCT.md",
        sha: "file-sha",
        status: "modified",
      },
    ],
  })
  expect(() => encodeToolResult(result)).not.toThrow()
})

test("lists pull request review comments", async () => {
  const fetchMock = stubGitHubResponses([
    [
      {
        id: 456,
        body: "Use website here.",
        html_url: "https://github.com/acme/app/pull/12#discussion_r456",
        path: "PRODUCT.md",
        user: { login: "reviewer" },
      },
    ],
  ])

  const result = await callGitHubTool(
    githubIntegration(),
    "github_list_pull_request_review_comments",
    { owner: "acme", pullNumber: 12, repo: "app" }
  )

  expect(fetchMock.mock.calls[0]?.[0]).toBe(
    "https://api.github.com/repos/acme/app/pulls/12/comments?page=1&per_page=30"
  )
  expect(result).toEqual({
    comments: [
      {
        author: "reviewer",
        body: "Use website here.",
        htmlUrl: "https://github.com/acme/app/pull/12#discussion_r456",
        id: 456,
        path: "PRODUCT.md",
      },
    ],
  })
  expect(() => encodeToolResult(result)).not.toThrow()
})

test("adds reactions to pull request review comments", async () => {
  const fetchMock = stubGitHubResponses([
    {
      id: 123,
      content: "rocket",
      user: { login: "jori" },
      created_at: "2026-06-12T15:28:00Z",
    },
  ])

  const result = await callGitHubTool(
    githubIntegration(),
    "github_add_comment_reaction",
    {
      commentId: 456,
      content: "rocket",
      owner: "acme",
      repo: "app",
      subject: "pull_request_review_comment",
    }
  )

  expect(fetchMock.mock.calls[0]?.[0]).toBe(
    "https://api.github.com/repos/acme/app/pulls/comments/456/reactions"
  )
  expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
    method: "POST",
    body: JSON.stringify({ content: "rocket" }),
  })
  expect(result).toEqual({
    content: "rocket",
    createdAt: "2026-06-12T15:28:00Z",
    id: 123,
    user: "jori",
  })
})

test("updates pull request metadata", async () => {
  const fetchMock = stubGitHubResponses([pullRequestPayload("New title")])

  const result = await callGitHubTool(
    githubIntegration(),
    "github_update_pull_request",
    {
      body: "",
      maintainerCanModify: true,
      owner: "acme",
      pullNumber: 12,
      repo: "app",
      title: "New title",
    }
  )

  expect(fetchMock.mock.calls[0]?.[0]).toBe(
    "https://api.github.com/repos/acme/app/pulls/12"
  )
  expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
    method: "PATCH",
    body: JSON.stringify({
      body: "",
      maintainer_can_modify: true,
      title: "New title",
    }),
  })
  expect(result).toMatchObject({ number: 12, title: "New title" })
})

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

function pullRequestPayload(title: string) {
  return {
    id: 100,
    number: 12,
    title,
    state: "open",
    html_url: "https://github.com/acme/app/pull/12",
  }
}
