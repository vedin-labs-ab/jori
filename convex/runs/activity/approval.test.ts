import { expect, test } from "vitest"
import { emptyActivityData } from "../../../test/convex/console"
import { type Doc, type Id } from "../../_generated/dataModel"
import { projectRelationActivity } from "./relations"
import { type ActivityData } from "./types"

test("projects approvals with surface action metadata", () => {
  const items = projectRelationActivity({
    ...emptyActivityData(),
    approvals: [
      {
        _creationTime: 1000,
        _id: "approval" as Id<"approvals">,
        args: "{}",
        code: "ABC123",
        createdAt: 1000,
        expiresAt: 2000,
        requestedBy: { kind: "self", externalId: "jori" },
        runId: "run" as Id<"runs">,
        status: "expired",
        summary: "Create a Notion page with the requested content.",
        surface: "notion",
        organizationId: "organization",
        tool: "notion_create_page",
      } as Doc<"approvals">,
    ],
    run: {} as Doc<"runs">,
  } satisfies ActivityData)

  expect(items).toContainEqual(
    expect.objectContaining({
      description: "Create a Notion page with the requested content.",
      kind: "approval",
      status: "expired",
      surface: "notion",
      title: "Approval expired",
      toolLabel: "Create Notion page",
    })
  )
})
