import { expect, test } from "vitest"
import { readGitHubBackfillItem } from "./github"

const repository = "copperline/payroll"

test("maps an open issue to its lifecycle snapshot", () => {
  const event = readGitHubBackfillItem(repository, {
    number: 73,
    title: "Tip-pooling certification",
    state: "open",
    html_url: "https://github.com/copperline/payroll/issues/73",
    updated_at: "2026-07-04T09:30:00Z",
    user: { id: 42, login: "jonas", type: "User" },
  })

  expect(event).toMatchObject({
    key: "github:backfill:copperline/payroll#73",
    type: "issue.opened",
    text: "Issue #73 opened in copperline/payroll: Tip-pooling certification",
    observedAt: Date.parse("2026-07-04T09:30:00Z"),
    data: {
      repository: { fullName: repository },
      issueNumber: 73,
      issue: { number: 73, title: "Tip-pooling certification" },
    },
  })
  expect(event?.actor).toMatchObject({
    kind: "person",
    externalId: "42",
    name: "jonas",
  })
})

test("maps a closed issue to the closed verb", () => {
  const event = readGitHubBackfillItem(repository, {
    number: 12,
    state: "closed",
    updated_at: "2026-07-01T08:00:00Z",
  })

  expect(event?.type).toBe("issue.closed")
})

test("detects a merged pull request through merged_at", () => {
  const event = readGitHubBackfillItem(repository, {
    number: 491,
    title: "Payroll sync retry",
    state: "closed",
    updated_at: "2026-07-10T12:00:00Z",
    pull_request: { merged_at: "2026-07-10T11:59:00Z" },
  })

  expect(event).toMatchObject({
    type: "pull_request.merged",
    data: { pullNumber: 491, isPullRequest: true },
  })
})

test("maps a closed unmerged pull request to the closed verb", () => {
  const event = readGitHubBackfillItem(repository, {
    number: 492,
    state: "closed",
    updated_at: "2026-07-10T12:00:00Z",
    pull_request: { merged_at: null },
  })

  expect(event?.type).toBe("pull_request.closed")
})

test("marks bot authors as bots", () => {
  const event = readGitHubBackfillItem(repository, {
    number: 9,
    state: "open",
    updated_at: "2026-07-02T10:00:00Z",
    user: { id: 7, login: "renovate[bot]", type: "Bot" },
  })

  expect(event?.actor).toMatchObject({ kind: "bot" })
})

test("drops items without a number or a parseable timestamp", () => {
  expect(
    readGitHubBackfillItem(repository, {
      state: "open",
      updated_at: "2026-07-02T10:00:00Z",
    })
  ).toBeNull()
  expect(
    readGitHubBackfillItem(repository, { number: 5, updated_at: "soon" })
  ).toBeNull()
})
