import { describe, expect, test, vi } from "vitest"
import { encodeJson } from "../../contracts/json"
import { type Doc, type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { type Actor } from "../shared/actor"
import { decideApproval, parseApprovalDecisionText } from "./runtime"

describe("approval command parsing", () => {
  test.each([
    ["approve yd4uefnv", "YD4UEFNV", "approved"],
    [" deny ABC12345 ", "ABC12345", "denied"],
    ["`approve yd4uefnv`", "YD4UEFNV", "approved"],
    ["```deny ABC12345```", "ABC12345", "denied"],
    ["```text\napprove yd4uefnv\n```", "YD4UEFNV", "approved"],
    ['"deny ABC12345"', "ABC12345", "denied"],
    ["approve ABC12345.", "ABC12345", "approved"],
    ["`approve ABC12345`!", "ABC12345", "approved"],
  ])("parses the complete command %s", (text, code, decision) => {
    expect(parseApprovalDecisionText(text)).toEqual({ code, decision })
  })

  test.each([
    "@jori approve ABC12345",
    "approve abc",
    "123approve ABC12345-",
    "I copied `approve ABC12345`",
    "do not approve ABC12345",
    "approve ABC12345 or deny ABC12345",
  ])("rejects incomplete commands or surrounding prose: %s", (text) => {
    expect(parseApprovalDecisionText(text)).toBeNull()
  })
})

describe("approval runtime decisions", () => {
  test.each([
    { status: "expired", message: expect.stringContaining("expired") },
    { status: "closed", message: "This run is no longer active." },
  ])("reports $status approvals without resuming the run", async ({
    status,
    message,
  }) => {
    const approval = approvalDoc()
    const ctx = {
      runMutation: vi.fn().mockResolvedValue({ status, approval }),
    } as unknown as ActionCtx

    const result = await decideApproval(ctx, {
      approval,
      decidedBy: userActor(),
      decision: "approved",
    })

    expect(result).toMatchObject({ status, message })
    expect(ctx.runMutation).toHaveBeenCalledTimes(1)
  })
})

function approvalDoc(): Doc<"approvals"> {
  return {
    _creationTime: 0,
    _id: "approval_1" as Id<"approvals">,
    args: encodeJson({}),
    code: "ABC12345",
    createdAt: 0,
    expiresAt: 1,
    requestedBy: userActor(),
    runId: "run_1" as Id<"runs">,
    status: "pending",
    summary: "Create a page.",
    surface: "notion",
    organizationId: "organization",
    tool: "notion_create_page",
  }
}

function userActor(): Actor {
  return {
    kind: "person",
    personId: "person_1" as Id<"persons">,
  }
}
