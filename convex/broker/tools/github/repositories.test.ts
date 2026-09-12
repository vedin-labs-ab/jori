import { afterEach, expect, test, vi } from "vitest"
import { schemaViolations } from "../../../../test/convex/schema"
import { integration } from "../../../../test/convex/tools"
import { getToolResponseSchema } from "../../../runs/agent/tools/schemas/responses"
import { callGitHubTool } from "."

afterEach(() => vi.unstubAllGlobals())

test.each([null, "Synthetic repository", undefined])(
  "repository adapters preserve description %j and satisfy their contracts",
  async (description) => {
    const repository = {
      id: 123,
      full_name: "acme/app",
      private: true,
      description,
      default_branch: "main",
      html_url: "https://github.com/acme/app",
      updated_at: "2026-09-08T12:00:00Z",
    }
    const summary = {
      id: 123,
      fullName: "acme/app",
      private: true,
      ...(description === undefined ? {} : { description }),
      defaultBranch: "main",
      htmlUrl: "https://github.com/acme/app",
      updatedAt: "2026-09-08T12:00:00Z",
    }
    const responses = [
      { total_count: 1, repositories: [repository] },
      repository,
    ]
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json(responses.shift()))
    )

    const list = await callGitHubTool(
      integration("github"),
      "github_list_repositories",
      {}
    )
    const single = await callGitHubTool(
      integration("github"),
      "github_get_repository",
      { owner: "acme", repo: "app" }
    )

    expect(list).toEqual({ totalCount: 1, repositories: [summary] })
    expect(single).toEqual(summary)
    expect(
      schemaViolations(list, getToolResponseSchema("github_list_repositories"))
    ).toEqual([])
    expect(
      schemaViolations(single, getToolResponseSchema("github_get_repository"))
    ).toEqual([])
  }
)

test.each([1, false, [], {}])(
  "repository contracts reject invalid description %j",
  (description) => {
    expect(
      schemaViolations(
        { description },
        getToolResponseSchema("github_get_repository")
      )
    ).not.toEqual([])
    expect(
      schemaViolations(
        { totalCount: 1, repositories: [{ description }] },
        getToolResponseSchema("github_list_repositories")
      )
    ).not.toEqual([])
  }
)
