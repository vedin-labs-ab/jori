import { expect, test } from "vitest"
import { readLinearBackfillIssue } from "./linear"

const window = {
  start: Date.parse("2026-06-20T00:00:00Z"),
  end: Date.parse("2026-08-04T00:00:00Z"),
}

test("maps an issue born inside the window as created", () => {
  const event = readLinearBackfillIssue(
    {
      id: "issue-1",
      identifier: "COP-73",
      title: "Tip-pooling certification",
      url: "https://linear.app/copperline/issue/COP-73",
      createdAt: "2026-07-01T09:00:00Z",
      updatedAt: "2026-07-04T09:30:00Z",
      team: { id: "team-1" },
      state: { name: "In Progress" },
      creator: { id: "user-1", name: "Jonas" },
    },
    window
  )

  expect(event).toMatchObject({
    key: "linear:backfill:issue-1",
    type: "issue.created",
    text: "Issue COP-73 created: Tip-pooling certification",
    observedAt: Date.parse("2026-07-04T09:30:00Z"),
    data: {
      action: "create",
      issueId: "issue-1",
      issueIdentifier: "COP-73",
      teamId: "team-1",
    },
  })
  expect(event?.actor).toMatchObject({ externalId: "user-1", name: "Jonas" })
})

test("maps an older issue as a state change naming the state", () => {
  const event = readLinearBackfillIssue(
    {
      id: "issue-2",
      identifier: "COP-12",
      title: "County letter",
      createdAt: "2026-01-05T09:00:00Z",
      updatedAt: "2026-07-02T10:00:00Z",
      state: { name: "Blocked" },
    },
    window
  )

  expect(event).toMatchObject({
    type: "issue.state_changed",
    text: "Issue COP-12 moved to Blocked: County letter",
    data: { action: "update" },
  })
})

test("carries the project when one exists", () => {
  const event = readLinearBackfillIssue(
    {
      id: "issue-3",
      createdAt: "2026-07-01T09:00:00Z",
      updatedAt: "2026-07-02T10:00:00Z",
      project: { id: "project-1", name: "2.14 release" },
    },
    window
  )

  expect(event?.data).toMatchObject({
    projectId: "project-1",
    project: { id: "project-1", name: "2.14 release" },
  })
})

test("drops nodes without an id or a parseable timestamp", () => {
  expect(
    readLinearBackfillIssue({ updatedAt: "2026-07-02T10:00:00Z" }, window)
  ).toBeNull()
  expect(
    readLinearBackfillIssue({ id: "issue-4", updatedAt: "soon" }, window)
  ).toBeNull()
})
