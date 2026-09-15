import { expect, test, vi } from "vitest"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"
import { type AgentRuntimeInput } from "../../runs/agent/input"
import { deliverApprovalRequest } from "./delivery"

// The console shows approvals on the run itself, so a console run neither
// posts a card nor records a delivery or a failure.
test("console approvals are not delivered anywhere", async () => {
  const runMutation = vi.fn()
  const ctx = { runMutation } as unknown as ActionCtx

  await deliverApprovalRequest(
    ctx,
    { input: consoleInput() },
    {
      approvalId: "approvals:1" as Id<"approvals">,
      code: "ABCD",
      surface: "notion",
      tool: "notion_create_page",
      summary: "Create a page.",
      expiresAt: 10,
    }
  )

  expect(runMutation).not.toHaveBeenCalled()
})

function consoleInput(): AgentRuntimeInput {
  return {
    type: "message",
    surface: "console",
    run: { _id: "runs:1" } as Doc<"runs">,
    integration: null,
    integrations: [],
    message: { _id: "messages:1", surface: "console" } as Doc<"messages">,
    conversation: { entries: [], hasMoreMessages: false, summary: null },
    organization: null,
    requester: null,
    place: null,
    timezone: null,
  }
}
