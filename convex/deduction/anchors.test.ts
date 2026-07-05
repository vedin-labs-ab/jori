import { expect, test } from "vitest"
import { type Doc } from "../_generated/dataModel"
import { eventAnchor } from "./anchors"

test("derives one container token per source", () => {
  expect(anchor({ repository: { fullName: "acme/app" } })).toBe(
    "github:repository:acme/app"
  )
  expect(anchor({ channel: { id: "C123" } })).toBe("slack:channel:C123")
  expect(
    anchor({
      notionEventId: "n1",
      notionEventType: "page.updated",
      workspaceId: "w1",
      entity: { id: "e1", type: "page" },
      parent: { id: "parent-1", type: "page" },
    })
  ).toBe("notion:page:parent-1")
  expect(anchor({ issueId: "i1", projectId: "p1" })).toBe("linear:project:p1")
})

test("yields nothing without a workstream-relevant container", () => {
  expect(anchor(undefined)).toBeUndefined()
  expect(anchor({ issueId: "i1" })).toBeUndefined()
  expect(
    anchor({
      notionEventId: "n1",
      notionEventType: "comment.created",
      workspaceId: "w1",
      entity: { id: "e1", type: "comment" },
    })
  ).toBeUndefined()
})

function anchor(data: Doc<"events">["data"]) {
  return eventAnchor({ data })
}
