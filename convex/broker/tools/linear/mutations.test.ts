import { afterEach, expect, test, vi } from "vitest"
import { schemaViolations } from "../../../../test/convex/schema"
import { integration } from "../../../../test/convex/tools"
import { postLinearComment } from "../../../integrations/linear/delivery/comments"
import { linearToolResponseSchemas } from "../../../runs/agent/tools/schemas/responses/linear"
import { callLinearTool } from "."

type LinearGraphqlCall = {
  body: {
    query: string
    variables?: Record<string, unknown>
  }
  headers: Record<string, string>
  method: string | undefined
  url: string
}

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
  vi.restoreAllMocks()
})

test("adds a Linear comment with CommentCreateInput", async () => {
  const comment = {
    id: "comment-id",
    body: "Tiny quip.",
    url: "https://linear.app/c/comment-id",
    parent: null,
    issue: { id: "issue-id", identifier: "ENG-1" },
  }
  const calls = mockLinearFetch({
    data: { commentCreate: { success: true, comment } },
  })

  const result = await callLinearTool(
    integration("linear"),
    "linear_add_comment",
    {
      body: "Tiny quip.",
      target: { id: "issue-id", type: "issue" },
    }
  )

  expect(result).toEqual({ success: true, comment })
  expect(
    schemaViolations(result, linearToolResponseSchemas.linear_add_comment)
  ).toEqual([])
  expect(calls[0]?.body.variables).toEqual({
    input: {
      body: "Tiny quip.",
      issueId: "issue-id",
    },
  })
})

test("posts a Linear comment reply through the first-class comment helper", async () => {
  const calls = mockLinearFetch({
    data: { commentCreate: { success: true } },
  })

  await postLinearComment(integration("linear"), {
    body: "Approval required.",
    target: { id: "comment-id", issueId: "issue-id", type: "comment" },
  })
  expect(calls[0]?.body.variables).toEqual({
    input: {
      body: "Approval required.",
      issueId: "issue-id",
      parentId: "comment-id",
    },
  })
})

test.each([
  [
    "comment",
    { id: "comment-id", type: "comment" },
    { commentId: "comment-id" },
  ],
  ["issue", { id: "issue-id", type: "issue" }, { issueId: "issue-id" }],
  [
    "project update",
    { id: "project-update-id", type: "projectUpdate" },
    { projectUpdateId: "project-update-id" },
  ],
])("adds a Linear reaction to a %s", async (_, target, expectedTarget) => {
  const calls = mockLinearFetch({
    data: { reactionCreate: { success: true } },
  })

  const result = await callLinearTool(
    integration("linear"),
    "linear_add_reaction",
    {
      emoji: "\u{1F44D}",
      target,
    }
  )

  expect(result).toEqual({ success: true, reaction: null })
  expect(
    schemaViolations(result, linearToolResponseSchemas.linear_add_reaction)
  ).toEqual([])
  expect(calls[0]?.body.variables).toEqual({
    input: { emoji: "\u{1F44D}", ...expectedTarget },
  })
  expect(calls[0]?.body.query).toContain("ReactionCreateInput")
  expect(calls[0]?.body.query).toContain("reactionCreate")
})

test("requires a supported Linear reaction target", async () => {
  await expect(
    callLinearTool(integration("linear"), "linear_add_reaction", {
      emoji: "\u{1F44D}",
      target: { id: "target-id", type: "unsupported" },
    })
  ).rejects.toThrow("target.type must be comment, issue, or projectUpdate")
})

function mockLinearFetch(
  responseBody: unknown | unknown[]
): LinearGraphqlCall[] {
  const calls: LinearGraphqlCall[] = []
  const responses = Array.isArray(responseBody) ? [...responseBody] : undefined

  globalThis.fetch = vi.fn(async (url, init) => {
    calls.push({
      body:
        typeof init?.body === "string"
          ? JSON.parse(init.body)
          : (init?.body as {
              query: string
              variables?: Record<string, unknown>
            }),
      headers: (init?.headers ?? {}) as Record<string, string>,
      method: init?.method,
      url: String(url),
    })

    return Response.json(responses?.shift() ?? responseBody)
  })

  return calls
}
