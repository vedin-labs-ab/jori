import { afterEach, describe, expect, test, vi } from "vitest"
import { type Doc } from "../../../_generated/dataModel"
import { callGitHubTool } from "./index"

describe("GitHub provider tools", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test("replies to pull request review comments with the GitHub replies endpoint", async () => {
    const fetchMock = vi.fn(
      async (_url: string | URL | Request, _options?: RequestInit) =>
        Response.json(
          {
            id: 789,
            body: "Nice.",
            html_url: "https://github.com/acme/app/pull/12#discussion_r789",
            user: { login: "milo" },
            created_at: "2026-06-12T15:28:00Z",
            updated_at: "2026-06-12T15:28:00Z",
          },
          { status: 201 }
        )
    )
    vi.stubGlobal("fetch", fetchMock)

    const result = await callGitHubTool(
      githubIntegration(),
      "github_reply_to_pull_request_review_comment",
      {
        body: "Nice.",
        commentId: 456,
        owner: "acme",
        pullNumber: 12,
        repo: "app",
      }
    )

    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toBe(
      "https://api.github.com/repos/acme/app/pulls/12/comments/456/replies"
    )
    expect(options).toMatchObject({
      method: "POST",
      headers: {
        accept: "application/vnd.github+json",
        authorization: "Bearer github-token",
        "x-github-api-version": "2022-11-28",
      },
      body: JSON.stringify({ body: "Nice." }),
    })
    expect(result).toEqual({
      id: 789,
      body: "Nice.",
      htmlUrl: "https://github.com/acme/app/pull/12#discussion_r789",
      author: "milo",
      createdAt: "2026-06-12T15:28:00Z",
      updatedAt: "2026-06-12T15:28:00Z",
    })
  })
})

function githubIntegration(): Doc<"integrations"> {
  return {
    _id: "github-integration",
    _creationTime: 0,
    tenantId: "tenant",
    provider: "github",
    scope: "tenant",
    externalId: "github-account",
    credentials: {
      installationId: "123",
      tokens: { access: "github-token" },
    },
    status: "active",
    createdBy: "user",
    createdAt: 0,
    updatedAt: 0,
  } as Doc<"integrations">
}
