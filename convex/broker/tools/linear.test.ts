import { afterEach, expect, test, vi } from "vitest"
import { type Doc } from "../../_generated/dataModel"
import { callLinearTool } from "./linear"

const originalFetch = globalThis.fetch

type LinearGraphqlCall = {
  body: {
    query: string
    variables?: Record<string, unknown>
  }
  headers: Record<string, string>
  method: string | undefined
  url: string
}

afterEach(() => {
  globalThis.fetch = originalFetch
  vi.restoreAllMocks()
})

test("searches Linear issue text and comments", async () => {
  const calls = mockLinearFetch({
    data: {
      issues: {
        nodes: [{ id: "issue-id", identifier: "VED-1", title: "Worth it" }],
      },
    },
  })

  const result = await callLinearTool(
    linearIntegration(),
    "linear_search_issues",
    {
      first: 20,
      query: '"worth spending time"',
    }
  )

  expect(result).toMatchObject({
    query: "worth spending time",
    issues: [{ id: "issue-id", identifier: "VED-1" }],
  })
  expect(calls).toHaveLength(1)
  expect(calls[0]).toMatchObject({
    headers: {
      authorization: "Bearer access-token",
      "content-type": "application/json",
    },
    method: "POST",
    url: "https://api.linear.app/graphql",
  })
  expect(calls[0]?.body.variables).toEqual({
    first: 20,
    query: "worth spending time",
  })
  expect(calls[0]?.body.query).toContain("containsIgnoreCase")
  expect(calls[0]?.body.query).toContain("comments")
})

test("deduplicates exact Linear identifier search results", async () => {
  const calls = mockLinearFetch([
    {
      data: {
        issue: { id: "issue-id", identifier: "VED-1", title: "Exact" },
      },
    },
    {
      data: {
        issues: {
          nodes: [
            { id: "issue-id", identifier: "VED-1", title: "Exact" },
            { id: "other-id", identifier: "VED-2", title: "Other" },
          ],
        },
      },
    },
  ])

  const result = await callLinearTool(
    linearIntegration(),
    "linear_search_issues",
    {
      query: "VED-1",
    }
  )

  expect(result).toMatchObject({
    query: "VED-1",
    issues: [
      { id: "issue-id", identifier: "VED-1" },
      { id: "other-id", identifier: "VED-2" },
    ],
  })
  expect(calls).toHaveLength(2)
  expect(calls[0]?.body.variables).toEqual({ id: "VED-1" })
})

test("reads a Linear issue by UUID or identifier", async () => {
  const calls = mockLinearFetch({
    data: {
      issue: { id: "issue-id", identifier: "VED-1", title: "Issue" },
    },
  })

  const result = await callLinearTool(linearIntegration(), "linear_get_issue", {
    issueId: "VED-1",
  })

  expect(result).toEqual({
    id: "issue-id",
    identifier: "VED-1",
    title: "Issue",
  })
  expect(calls[0]?.body.variables).toEqual({ id: "VED-1" })
  expect(calls[0]?.body.query).toContain("comments(first: 25)")
})

test("lists Linear issue comments", async () => {
  const calls = mockLinearFetch({
    data: {
      issue: {
        comments: {
          nodes: [{ id: "comment-id", body: "Worth it?" }],
        },
      },
    },
  })

  const result = await callLinearTool(
    linearIntegration(),
    "linear_list_comments",
    {
      first: 5,
      issueId: "issue-id",
    }
  )

  expect(result).toEqual([{ id: "comment-id", body: "Worth it?" }])
  expect(calls[0]?.body.variables).toEqual({ first: 5, id: "issue-id" })
})

test("adds a Linear comment with CommentCreateInput", async () => {
  const calls = mockLinearFetch({
    data: { commentCreate: { success: true } },
  })

  await callLinearTool(linearIntegration(), "linear_add_comment", {
    body: "Tiny quip.",
    issueId: "issue-id",
  })
  expect(calls[0]?.body.variables).toEqual({
    input: {
      body: "Tiny quip.",
      issueId: "issue-id",
    },
  })
})

test("adds a Linear reaction with ReactionCreateInput", async () => {
  const calls = mockLinearFetch({
    data: { reactionCreate: { success: true } },
  })

  await callLinearTool(linearIntegration(), "linear_add_reaction", {
    commentId: "comment-id",
    emoji: "\u{1F44D}",
  })

  expect(calls[0]?.body.variables).toEqual({
    input: { commentId: "comment-id", emoji: "\u{1F44D}" },
  })
  expect(calls[0]?.body.query).toContain("ReactionCreateInput")
  expect(calls[0]?.body.query).toContain("reactionCreate")
})

test("requires exactly one Linear reaction target", async () => {
  await expect(
    callLinearTool(linearIntegration(), "linear_add_reaction", {
      emoji: "\u{1F44D}",
      issueId: "issue-id",
      commentId: "comment-id",
    })
  ).rejects.toThrow("Provide exactly one Linear reaction target")
})

test("throws on Linear GraphQL errors", async () => {
  mockLinearFetch({ errors: [{ message: "Nope" }] })

  await expect(
    callLinearTool(linearIntegration(), "linear_get_issue", {
      issueId: "issue-id",
    })
  ).rejects.toThrow("Linear GraphQL request failed")
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

function linearIntegration(): Doc<"integrations"> {
  return {
    _id: "linear-integration",
    _creationTime: 0,
    tenantId: "tenant",
    integration: "linear",
    scope: "tenant",
    externalId: "linear-account",
    credentials: {
      tokens: { access: "access-token", refresh: "refresh-token" },
      expiresAt: Date.now() + 60_000,
    },
    status: "active",
    createdBy: "user",
    createdAt: 0,
    updatedAt: 0,
  } as Doc<"integrations">
}
