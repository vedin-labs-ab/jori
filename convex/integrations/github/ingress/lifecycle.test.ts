import { expect, test } from "vitest"
import { getGitHubLifecycleEvent } from "./lifecycle"

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

const pushBase = {
  ...base,
  repository: { full_name: "acme/app", default_branch: "main" },
  ref: "refs/heads/main",
}

test("reads default-branch pushes with subjects and touched areas", () => {
  const event = getGitHubLifecycleEvent({
    event: "push",
    deliveryId: "d10",
    payload: {
      ...pushBase,
      commits: [
        {
          message: "Add pass loop\n\nDetails here.",
          added: ["convex/deduction/pass.ts"],
          modified: ["convex/crons.ts"],
        },
        { message: "Fix sweep registry", modified: ["prompts/charter.md"] },
      ],
    },
  })

  expect(event).toMatchObject({
    accountId: "77",
    key: "github:lifecycle:d10",
    type: "commits.pushed",
    text: "2 commits pushed to main in acme/app (convex, prompts):\n- Add pass loop\n- Fix sweep registry",
    data: { repository: { fullName: "acme/app" } },
  })
})

test("lists every subject and uses singular phrasing", () => {
  const many = getGitHubLifecycleEvent({
    event: "push",
    deliveryId: "d11",
    payload: {
      ...pushBase,
      commits: [
        { message: "One" },
        { message: "Two" },
        { message: "Three" },
        { message: "Four" },
      ],
    },
  })
  const single = getGitHubLifecycleEvent({
    event: "push",
    deliveryId: "d12",
    payload: { ...pushBase, commits: [{ message: "Only" }] },
  })

  expect(many?.text).toBe(
    "4 commits pushed to main in acme/app:\n- One\n- Two\n- Three\n- Four"
  )
  expect(single?.text).toBe("1 commit pushed to main in acme/app:\n- Only")
})

test("caps pathological pushes and counts the hidden remainder", () => {
  const event = getGitHubLifecycleEvent({
    event: "push",
    deliveryId: "d16",
    payload: {
      ...pushBase,
      commits: Array.from({ length: 53 }, (_, index) => ({
        message: `Commit ${index + 1}`,
      })),
    },
  })
  const lines = event?.text.split("\n") ?? []

  expect(lines[0]).toBe("53 commits pushed to main in acme/app:")
  expect(lines).toHaveLength(52)
  expect(lines[50]).toBe("- Commit 50")
  expect(lines.at(-1)).toBe("…and 3 more")
})

test("ignores feature branches, deletions, and empty pushes", () => {
  expect(
    getGitHubLifecycleEvent({
      event: "push",
      deliveryId: "d13",
      payload: {
        ...pushBase,
        ref: "refs/heads/feature/cutover",
        commits: [{ message: "WIP" }],
      },
    })
  ).toBeNull()
  expect(
    getGitHubLifecycleEvent({
      event: "push",
      deliveryId: "d14",
      payload: { ...pushBase, deleted: true, commits: [{ message: "x" }] },
    })
  ).toBeNull()
  expect(
    getGitHubLifecycleEvent({
      event: "push",
      deliveryId: "d15",
      payload: { ...pushBase, commits: [] },
    })
  ).toBeNull()
})
