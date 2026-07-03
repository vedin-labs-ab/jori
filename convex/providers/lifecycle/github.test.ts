import { expect, test } from "vitest"
import { getGitHubLifecycleEvent } from "./github"

const base = {
  installation: { id: 77 },
  repository: { full_name: "acme/app" },
  sender: { id: 5, login: "dana", type: "User" },
}

test("reads issue lifecycle actions", () => {
  const event = getGitHubLifecycleEvent({
    event: "issues",
    deliveryId: "d1",
    payload: {
      ...base,
      action: "closed",
      issue: { number: 12, title: "Fix cutover", html_url: "https://x" },
    },
  })

  expect(event).toMatchObject({
    accountId: "77",
    key: "github:lifecycle:d1",
    type: "issue.closed",
    text: "Issue #12 closed in acme/app: Fix cutover",
    actor: { externalId: "5", name: "dana", kind: "person" },
    data: { issueNumber: 12, repository: { fullName: "acme/app" } },
  })
})

test("distinguishes merged from closed pull requests", () => {
  const merged = getGitHubLifecycleEvent({
    event: "pull_request",
    deliveryId: "d2",
    payload: {
      ...base,
      action: "closed",
      pull_request: { number: 9, title: "Routing", merged: true },
    },
  })
  const closed = getGitHubLifecycleEvent({
    event: "pull_request",
    deliveryId: "d3",
    payload: {
      ...base,
      action: "closed",
      pull_request: { number: 9, title: "Routing", merged: false },
    },
  })

  expect(merged?.type).toBe("pull_request.merged")
  expect(merged?.text).toBe("Pull request #9 merged in acme/app: Routing")
  expect(closed?.type).toBe("pull_request.closed")
})

test("ignores unhandled events, actions, and incomplete payloads", () => {
  expect(
    getGitHubLifecycleEvent({
      event: "issues",
      deliveryId: "d4",
      payload: { ...base, action: "labeled", issue: { number: 1 } },
    })
  ).toBeNull()
  expect(
    getGitHubLifecycleEvent({
      event: "workflow_run",
      deliveryId: "d5",
      payload: { ...base, action: "completed" },
    })
  ).toBeNull()
  expect(
    getGitHubLifecycleEvent({
      event: "issues",
      deliveryId: null,
      payload: { ...base, action: "opened", issue: { number: 1 } },
    })
  ).toBeNull()
  expect(
    getGitHubLifecycleEvent({
      event: "issues",
      deliveryId: "d6",
      payload: { action: "opened", issue: { number: 1 } },
    })
  ).toBeNull()
})
