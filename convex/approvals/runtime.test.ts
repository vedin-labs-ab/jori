import { describe, expect, test, vi } from "vitest"
import { encodeToolInput } from "../../contracts/transport"
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
    expect(parseApprovalDecisionText("@milo approve ABC12345")).toBeNull()
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
  test("reports expired approvals without a second mutation", async () => {
    const approval = approvalDoc()
    const ctx = actionCtx(async () => ({
      status: "expired" as const,
      approval,
    }))

    const result = await decideApproval(ctx, {
      approval,
      decidedBy: userActor(),
      decision: "approved",
    })

    expect(result.status).toBe("expired")
    expect(result.message).toContain("expired")
    expect(ctx.runMutation).toHaveBeenCalledTimes(1)
  })

  test("does not resume approvals for closed runs", async () => {
    const approval = approvalDoc()
    const ctx = actionCtx(async (args) => {
      if ("decidedBy" in args) {
        return {
          status: "closed" as const,
          approval,
        }
      }

      return null
    })

    const result = await decideApproval(ctx, {
      approval,
      decidedBy: userActor(),
      decision: "approved",
    })

    expect(result).toMatchObject({
      message: "This run is no longer active.",
      status: "closed",
    })
    expect(ctx.runMutation).toHaveBeenCalledTimes(1)
  })
})

function actionCtx(
  runMutation: (args: Record<string, unknown>) => Promise<unknown>,
  runQuery: (args: Record<string, unknown>) => Promise<unknown> = async () =>
    null
) {
  return {
    runMutation: vi.fn(
      async (_reference: unknown, args: Record<string, unknown>) =>
        runMutation(args)
    ),
    runQuery: vi.fn(
      async (_reference: unknown, args: Record<string, unknown>) =>
        runQuery(args)
    ),
  } as unknown as ActionCtx & {
    runMutation: ReturnType<typeof vi.fn>
    runQuery: ReturnType<typeof vi.fn>
  }
}

function approvalDoc(): Doc<"approvals"> {
  return {
    _creationTime: 0,
    _id: "approval_1" as Id<"approvals">,
    args: encodeToolInput({}).inputJson,
    code: "ABC12345",
    createdAt: 0,
    expiresAt: 1,
    requestedBy: userActor(),
    runId: "run_1" as Id<"runs">,
    status: "pending",
    summary: "Create a page.",
    surface: "notion",
    tenantId: "tenant",
    tool: "notion_create_page",
  }
}

function userActor(): Actor {
  return {
    kind: "person",
    personId: "person_1" as Id<"persons">,
  }
}
