import { expect, test, vi } from "vitest"
import { encodeJson } from "../../../../contracts/json"
import { integrationDoc } from "../../../../test/convex/integrations"
import { type Doc, type Id } from "../../../_generated/dataModel"
import { type ActionCtx } from "../../../_generated/server"
import { handleLinearApprovalDecision } from "./approvals"

test("handles exact Linear text approval commands", async () => {
  const approval = approvalDoc()
  const integration = integrationDoc({
    integration: "linear",
    externalId: "linear-org",
  })
  const ctx = actionCtx({
    queryResult: { approval, integration },
    mutationResult: { approval, status: "approved" as const },
  })

  const handled = await handleLinearApprovalDecision(ctx, {
    accountId: "linear-org",
    actorEmail: "albin@example.com",
    actorId: "linear-user",
    actorKind: "person",
    actorName: "Albin Vedin",
    text: "approve yd4uefnv",
  })

  expect(handled).toBe(true)
  expect(ctx.runQuery).toHaveBeenCalledWith(expect.anything(), {
    accountId: "linear-org",
    code: "YD4UEFNV",
    integration: "linear",
  })
  expect(ctx.runMutation).toHaveBeenCalledWith(expect.anything(), {
    approvalId: approval._id,
    decidedBy: {
      email: "albin@example.com",
      externalId: "linear-user",
      kind: "person",
      name: "Albin Vedin",
    },
    decision: "approved",
  })
})

test("lets ordinary Linear messages fall through to intake", async () => {
  const ctx = actionCtx()

  const handled = await handleLinearApprovalDecision(ctx, {
    accountId: "linear-org",
    actorKind: "person",
    text: "hello jori",
  })

  expect(handled).toBe(false)
  expect(ctx.runQuery).not.toHaveBeenCalled()
  expect(ctx.runMutation).not.toHaveBeenCalled()
})

function actionCtx(args: ActionCtxArgs = {}) {
  return {
    runMutation: vi.fn(async () => args.mutationResult ?? null),
    runQuery: vi.fn(async () => args.queryResult ?? null),
  } as unknown as ActionCtx & {
    runMutation: ReturnType<typeof vi.fn>
    runQuery: ReturnType<typeof vi.fn>
  }
}

type ActionCtxArgs = {
  mutationResult?: unknown
  queryResult?: unknown
}

function approvalDoc(): Doc<"approvals"> {
  return {
    _creationTime: 0,
    _id: "approval_1" as Id<"approvals">,
    args: encodeJson({}),
    code: "YD4UEFNV",
    createdAt: 0,
    expiresAt: 1,
    requestedBy: { kind: "person", personId: "person_1" as Id<"persons"> },
    runId: "run_1" as Id<"runs">,
    status: "pending",
    summary: "Create a page.",
    surface: "notion",
    organizationId: "organization",
    tool: "notion_create_page",
  }
}
