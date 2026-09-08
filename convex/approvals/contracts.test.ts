import { expect, test, vi } from "vitest"
import { schemaViolations } from "../../test/convex/schema"
import { type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { brokerJoriToolResponseSchemas } from "../runs/agent/tools/schemas/responses/jori/broker"
import { cancelApprovalRequest } from "./cancel"

test.each([
  ["cancelled", "cancelled"],
  ["missing", "missing"],
  ["invalid_message", "invalid_message"],
  ["decided", "already_resolved"],
  ["expired", "already_resolved"],
  ["failed", "already_resolved"],
])("approval cancellation normalizes %s to its documented %s result", async (storedStatus, expectedStatus) => {
  const runMutation = vi.fn(async () => ({ status: storedStatus }))
  const result = await cancelApprovalRequest(
    { runMutation } as unknown as ActionCtx,
    { _id: "run" as Id<"runs">, organizationId: "verification" },
    { approvalId: "approval", messageId: "message", reason: "Synthetic test" }
  )
  expect(result.status).toBe(expectedStatus)
  expect(
    schemaViolations(
      result,
      brokerJoriToolResponseSchemas.cancel_approval_request
    )
  ).toEqual([])
  expect(runMutation).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ runId: "run", messageId: "message" })
  )
})

test.each([
  "decided",
  "expired",
  "failed",
])("cancellation response does not expose internal %s status", (status) => {
  expect(
    schemaViolations(
      { status, message: "Internal status" },
      brokerJoriToolResponseSchemas.cancel_approval_request
    )
  ).not.toEqual([])
})
