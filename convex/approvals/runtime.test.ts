import { describe, expect, test, vi } from "vitest"
import { encodeJson } from "../../contracts/json"
import { type Doc, type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { type Actor } from "../shared/actor"
import { decideApproval, parseApprovalDecisionText } from "./runtime"

describe("approval command parsing", () => {
  test("parses provider-neutral text commands", () => {
    expect(parseApprovalDecisionText("approve yd4uefnv")).toEqual({
      code: "YD4UEFNV",
      decision: "approved",
    })
    expect(parseApprovalDecisionText(" deny ABC12345 ")).toEqual({
      code: "ABC12345",
      decision: "denied",
    })
    expect(parseApprovalDecisionText("@jori approve ABC12345")).toBeNull()
    expect(parseApprovalDecisionText("approve abc")).toBeNull()
  })

  test("accepts copied approval commands with message formatting", () => {
    expect(parseApprovalDecisionText("`approve yd4uefnv`")).toEqual({
      code: "YD4UEFNV",
      decision: "approved",
    })
    expect(parseApprovalDecisionText("```deny ABC12345```")).toEqual({
      code: "ABC12345",
      decision: "denied",
    })
    expect(parseApprovalDecisionText("```text\napprove yd4uefnv\n```")).toEqual(
      {
        code: "YD4UEFNV",
        decision: "approved",
      }
    )
    expect(parseApprovalDecisionText('"deny ABC12345"')).toEqual({
      code: "ABC12345",
      decision: "denied",
    })
    expect(parseApprovalDecisionText("approve ABC12345.")).toEqual({
      code: "ABC12345",
      decision: "approved",
    })
    expect(parseApprovalDecisionText("`approve ABC12345`!")).toEqual({
      code: "ABC12345",
      decision: "approved",
    })
  })

  test("rejects approval commands embedded in prose or other text", () => {
    expect(parseApprovalDecisionText("123approve ABC12345-")).toBeNull()
    expect(parseApprovalDecisionText("I copied `approve ABC12345`")).toBeNull()
    expect(parseApprovalDecisionText("do not approve ABC12345")).toBeNull()
    expect(
      parseApprovalDecisionText("approve ABC12345 or deny ABC12345")
    ).toBeNull()
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
