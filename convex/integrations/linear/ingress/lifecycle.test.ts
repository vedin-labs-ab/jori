import { describe, expect, test } from "vitest"
import { getLinearLifecycleEvent } from "./lifecycle"

const base = {
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

const project = {
  id: "project-1",
  name: "Payments revamp",
  url: "https://linear.app/p",
  status: { name: "Completed" },
}

describe("linear issue lifecycle", () => {
  test("reads issue creation with project context in the gist", () => {
    const event = getLinearLifecycleEvent({
      deliveryId: "d1",
      payload: { ...base, type: "Issue", action: "create", data: issue },
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
        type: "Issue",
        action: "update",
        data: issue,
        updatedFrom: { stateId: "old-state" },
      },
    })
    const retitled = getLinearLifecycleEvent({
      deliveryId: "d3",
      payload: {
        ...base,
        type: "Issue",
        action: "update",
        data: issue,
        updatedFrom: { title: "Old title" },
      },
    })

    expect(moved?.type).toBe("issue.state_changed")
    expect(moved?.text).toBe(
      "Linear issue ENG-42 moved to Done: Fix cutover (project: Payments revamp)"
    )
    expect(retitled).toBeNull()
  })
})

describe("linear project lifecycle", () => {
  test("reads project creation and removal", () => {
    const created = getLinearLifecycleEvent({
      deliveryId: "d4",
      payload: { ...base, type: "Project", action: "create", data: project },
    })
    const removed = getLinearLifecycleEvent({
      deliveryId: "d5",
      payload: { ...base, type: "Project", action: "remove", data: project },
    })

    expect(created).toMatchObject({
      accountId: "org-1",
      key: "linear:lifecycle:d4",
      type: "project.created",
      text: "Linear project Payments revamp created",
      data: {
        projectId: "project-1",
        project: { id: "project-1", name: "Payments revamp" },
      },
    })
    expect(removed?.type).toBe("project.removed")
  })

  test("reads project transitions from any state field", () => {
    const completed = getLinearLifecycleEvent({
      deliveryId: "d6",
      payload: {
        ...base,
        type: "Project",
        action: "update",
        data: project,
        updatedFrom: { completedAt: null },
      },
    })
    const renamed = getLinearLifecycleEvent({
      deliveryId: "d7",
      payload: {
        ...base,
        type: "Project",
        action: "update",
        data: project,
        updatedFrom: { name: "Old name" },
      },
    })

    expect(completed?.type).toBe("project.state_changed")
    expect(completed?.text).toBe(
      "Linear project Payments revamp moved to Completed"
    )
    expect(renamed).toBeNull()
  })
})

describe("linear lifecycle guards", () => {
  test("ignores other payload types and incomplete data", () => {
    expect(
      getLinearLifecycleEvent({
        deliveryId: "d8",
        payload: { ...base, type: "Comment", action: "create", data: issue },
      })
    ).toBeNull()
    expect(
      getLinearLifecycleEvent({
        deliveryId: null,
        payload: { ...base, type: "Project", action: "create", data: project },
      })
    ).toBeNull()
    expect(
      getLinearLifecycleEvent({
        deliveryId: "d9",
        payload: { ...base, type: "Project", action: "create", data: {} },
      })
    ).toBeNull()
  })
})
