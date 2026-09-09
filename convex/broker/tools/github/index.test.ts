import { afterEach, describe, expect, test, vi } from "vitest"
import { encodeToolResult } from "../../../../contracts/json"
import { integration } from "../../../../test/convex/tools"
import { callGitHubTool, createGitHubCloneCredentials } from "./index"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("GitHub clone provider tool", () => {
  test("returns a JSON-safe clone descriptor", async () => {
    const result = await callGitHubTool(
      integration("github"),
      "github_clone_repository",
      {
        owner: "acme",
        repo: "app",
      }
    )

    expect(result).toEqual({
      clone: {
        kind: "github_repository",
        owner: "acme",
        repo: "app",
      },
    })
    expect(() => encodeToolResult(result)).not.toThrow()
  })

  test("preserves explicit clone destination and ref", async () => {
    const result = await callGitHubTool(
      integration("github"),
      "github_clone_repository",
      {
        directory: "workspace-app",
        owner: "acme",
        ref: "main",
        repo: "app",
      }
    )

    expect(result).toEqual({
      clone: {
        directory: "workspace-app",
        kind: "github_repository",
        owner: "acme",
        ref: "main",
        repo: "app",
      },
    })
    expect(() => encodeToolResult(result)).not.toThrow()
  })

  test("creates clone credentials without exposing them through clone results", () => {
    expect(
      createGitHubCloneCredentials({
        integration: integration("github"),
        owner: "acme",
        repo: "app",
      })
    ).toEqual({
      remoteUrl: "https://github.com/acme/app.git",
      token: "github-token",
      username: "x-access-token",
    })
  })
})

describe("GitHub comment tool", () => {
  test("replies to pull request review comments with the GitHub replies endpoint", async () => {
    const fetchMock = vi.fn(
      async (_url: string | URL | Request, _options?: RequestInit) =>
        Response.json(
          {
            id: 789,
            body: "Nice.",
            html_url: "https://github.com/acme/app/pull/12#discussion_r789",
            user: { login: "jori" },
            created_at: "2026-06-12T15:28:00Z",
            updated_at: "2026-06-12T15:28:00Z",
          },
          { status: 201 }
        )
    )
    vi.stubGlobal("fetch", fetchMock)

    const result = await callGitHubTool(
      integration("github"),
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
      author: "jori",
      createdAt: "2026-06-12T15:28:00Z",
      updatedAt: "2026-06-12T15:28:00Z",
    })
  })
})
