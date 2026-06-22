import { describe, expect, test, vi } from "vitest"
import { encodeToolInput } from "../../contracts/tool-transport"
import { type Doc, type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { type Actor } from "../shared/actor"
import { decideApproval } from "./runtime"

describe("approval runtime decisions", () => {
  test("resumes expired waitpoints as denied approvals", async () => {
    const approval = approvalDoc()
    const ctx = actionCtx(async (args) => {
      if ("decidedBy" in args) {
        return {
          status: "expired" as const,
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

    expect(result.status).toBe("expired")
    expect(ctx.runMutation).toHaveBeenCalledWith(expect.anything(), {
      approvalId: approval._id,
      decision: "denied",
    })
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
  runMutation: (args: Record<string, unknown>) => Promise<unknown>
) {
  return {
    runMutation: vi.fn(
      async (_reference: unknown, args: Record<string, unknown>) =>
        runMutation(args)
    ),
  } as unknown as ActionCtx & {
    runMutation: ReturnType<typeof vi.fn>
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
    summary: "Create a page.",
    surface: "notion",
    tenantId: "tenant",
    tool: "notion_create_page",
    waitpointId: "waitpoint_1",
  }
}

function userActor(): Actor {
  return {
    kind: "user",
    userId: "user_1",
  }
}
