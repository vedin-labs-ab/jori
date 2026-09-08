import { afterEach, expect, test, vi } from "vitest"
import { schemaViolations } from "../../../../test/convex/schema"
import { integration } from "../../../../test/convex/tools"
import { getToolResponseSchema } from "../../../runs/agent/tools/schemas/responses"
import { callGitHubTool } from "."

afterEach(() => vi.unstubAllGlobals())

test.each([
  null,
  "Synthetic body",
  undefined,
])("issue and pull request adapters preserve body %j", async (body) => {
  const item = {
    id: 123,
    number: 42,
    title: "Synthetic issue",
    state: "open",
    body,
    user: { login: "test-user" },
  }
  const responses = [item, [], item]
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json(responses.shift()))
  )

  const issue = await callGitHubTool(
    integration("github"),
    "github_get_issue",
    { owner: "acme", repo: "app", issueNumber: 42 }
  )
  const pullRequest = await callGitHubTool(
    integration("github"),
    "github_get_pull_request",
    { owner: "acme", repo: "app", pullNumber: 42 }
  )
  const summary = {
    id: 123,
    number: 42,
    title: "Synthetic issue",
    state: "open",
    ...(body === undefined ? {} : { body }),
    author: "test-user",
  }

  expect(issue).toEqual({
    issue: { ...summary, pullRequest: false, assignees: [], labels: [] },
    comments: [],
  })
  expect(pullRequest).toEqual(summary)
  expect(
    schemaViolations(issue, getToolResponseSchema("github_get_issue"))
  ).toEqual([])
  expect(
    schemaViolations(
      pullRequest,
      getToolResponseSchema("github_get_pull_request")
    )
  ).toEqual([])
})

test.each([
  1,
  false,
  [],
  {},
])("issue and pull request contracts reject invalid body %j", (body) => {
  expect(
    schemaViolations(
      { issue: { body }, comments: [] },
      getToolResponseSchema("github_get_issue")
    )
  ).not.toEqual([])
  expect(
    schemaViolations({ body }, getToolResponseSchema("github_get_pull_request"))
  ).not.toEqual([])
})
