import { describe, expect, test } from "vitest"
import { getLinearLifecycleEvent } from "./linear"

const base = {
  type: "Issue",
  organizationId: "org-1",
  actor: { id: "u1", name: "Dana", type: "user" },
}

const issue = {
  id: "issue-1",
  identifier: "ENG-42",
  title: "Fix cutover",
  url: "https://linear.app/x",
  teamId: "team-1",
  projectId: "project-1",
  project: { name: "Payments revamp" },
  state: { name: "Done" },
}

describe("linear lifecycle events", () => {
  test("reads issue creation with project context in the gist", () => {
    const event = getLinearLifecycleEvent({
      deliveryId: "d1",
      payload: { ...base, action: "create", data: issue },
    })

    expect(event).toMatchObject({
      accountId: "org-1",
      key: "linear:lifecycle:d1",
      type: "issue.created",
      text: "Linear issue ENG-42 created: Fix cutover (project: Payments revamp)",
      data: { issueId: "issue-1", projectId: "project-1" },
    })
  })

  test("reads state changes only when the state actually changed", () => {
    const moved = getLinearLifecycleEvent({
      deliveryId: "d2",
      payload: {
        ...base,
        action: "update",
        data: issue,
        updatedFrom: { stateId: "old-state" },
      } as Parameters<typeof getLinearLifecycleEvent>[0]["payload"],
    })
    const retitled = getLinearLifecycleEvent({
      deliveryId: "d3",
      payload: {
        ...base,
        action: "update",
        data: issue,
        updatedFrom: { title: "Old title" },
      } as Parameters<typeof getLinearLifecycleEvent>[0]["payload"],
    })

    expect(moved?.type).toBe("issue.state_changed")
    expect(moved?.text).toBe(
      "Linear issue ENG-42 moved to Done: Fix cutover (project: Payments revamp)"
    )
    expect(retitled).toBeNull()
  })

  test("ignores non-issue payloads and incomplete data", () => {
    expect(
      getLinearLifecycleEvent({
        deliveryId: "d4",
        payload: { ...base, type: "Comment", action: "create", data: issue },
      })
    ).toBeNull()
    expect(
      getLinearLifecycleEvent({
        deliveryId: null,
        payload: { ...base, action: "create", data: issue },
      })
    ).toBeNull()
    expect(
      getLinearLifecycleEvent({
        deliveryId: "d5",
        payload: { ...base, action: "create", data: {} },
      })
    ).toBeNull()
  })
})
