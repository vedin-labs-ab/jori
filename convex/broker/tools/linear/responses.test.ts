import { afterEach, expect, test, vi } from "vitest"
import { schemaViolations } from "../../../../test/convex/schema"
import { integration } from "../../../../test/convex/tools"
import { getToolResponseSchema } from "../../../runs/agent/tools/schemas/responses"
import { callLinearTool } from "."

afterEach(() => vi.unstubAllGlobals())

const user = { id: "synthetic-user", name: "Test user" }

test.each([null, user])(
  "Linear issue adapters preserve nullable users %j",
  async (person) => {
    const issue = {
      id: "synthetic-issue",
      identifier: "ENG-42",
      title: "Synthetic issue",
      url: "https://linear.app/acme/issue/ENG-42",
      updatedAt: "2026-09-08T12:00:00Z",
      state: { name: "Todo", type: "unstarted" },
      assignee: person,
      creator: person,
    }
    const responses = [
      { data: { issues: { nodes: [issue] } } },
      {
        data: {
          issue: { ...issue, description: null, comments: { nodes: [] } },
        },
      },
    ]
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json(responses.shift()))
    )

    const search = await callLinearTool(
      integration("linear"),
      "linear_search_issues",
      { query: "Synthetic" }
    )
    const single = await callLinearTool(
      integration("linear"),
      "linear_get_issue",
      { issueId: issue.id }
    )

    expect(search).toEqual({ query: "Synthetic", issues: [issue] })
    expect(single).toEqual({
      ...issue,
      description: null,
      comments: { nodes: [] },
    })
    expect(
      schemaViolations(search, getToolResponseSchema("linear_search_issues"))
    ).toEqual([])
    expect(
      schemaViolations(single, getToolResponseSchema("linear_get_issue"))
    ).toEqual([])
  }
)

test.each([
  { parent: null, user },
  { parent: { id: "synthetic-parent" }, user },
  { parent: null, user: null },
])(
  "Linear comments preserve nullable parent and author %j",
  async (references) => {
    const comment = {
      id: "synthetic-comment",
      body: "Synthetic comment",
      createdAt: "2026-09-08T12:00:00Z",
      updatedAt: "2026-09-08T12:00:00Z",
      url: "https://linear.app/acme/issue/ENG-42#comment-synthetic",
      ...references,
    }
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          data: {
            issue: { id: "synthetic-issue", comments: { nodes: [comment] } },
          },
        })
      )
    )
    const result = await callLinearTool(
      integration("linear"),
      "linear_list_comments",
      { issueId: "synthetic-issue" }
    )

    expect(result).toEqual([comment])
    expect(
      schemaViolations(result, getToolResponseSchema("linear_list_comments"))
    ).toEqual([])
  }
)

test.each([[], "user-id", 1, false])(
  "Linear contracts reject non-object references %j",
  (value) => {
    for (const field of ["assignee", "creator"]) {
      expect(
        schemaViolations(
          { [field]: value },
          getToolResponseSchema("linear_get_issue")
        )
      ).not.toEqual([])
      expect(
        schemaViolations(
          { query: "test", issues: [{ [field]: value }] },
          getToolResponseSchema("linear_search_issues")
        )
      ).not.toEqual([])
    }
    for (const field of ["parent", "user"]) {
      expect(
        schemaViolations(
          [{ [field]: value }],
          getToolResponseSchema("linear_list_comments")
        )
      ).not.toEqual([])
    }
  }
)
