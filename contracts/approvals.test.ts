import { expect, test } from "vitest"
import { withApprovalSchema } from "./approvals"
import { toolFinalDescription } from "./runtime/tools"

test("approval-wrapped tools use the shared final field", () => {
  const schema = withApprovalSchema({
    properties: {
      title: { type: "string" },
    },
    required: ["title"],
  })

  expect(schema).toMatchObject({
    properties: {
      approval: {
        required: ["summary"],
      },
      final: {
        description: toolFinalDescription,
        type: "boolean",
      },
      title: { type: "string" },
    },
    required: ["title", "approval"],
  })
})
