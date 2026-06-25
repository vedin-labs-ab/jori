import { expect, test, vi } from "vitest"
import { encodeToolInput } from "../../../contracts/transport"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"
import { handleLinearApprovalDecision } from "./approvals"

test("handles exact Linear text approval commands", async () => {
  const approval = approvalDoc()
  const integration = integrationDoc()
  const ctx = actionCtx({
    queryResult: { approval, integration },
    mutationResult: { approval, status: "approved" as const },
  })

  const handled = await handleLinearApprovalDecision(ctx, {
    accountId: "linear-org",
    actorEmail: "albin@example.com",
    actorId: "linear-user",
    actorKind: "user",
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
      kind: "user",
      name: "Albin Vedin",
    },
    decision: "approved",
  })
})

test("lets ordinary Linear messages fall through to intake", async () => {
  const ctx = actionCtx()

  const handled = await handleLinearApprovalDecision(ctx, {
    accountId: "linear-org",
    actorKind: "user",
    text: "hello milo",
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
    args: encodeToolInput({}).inputJson,
    code: "YD4UEFNV",
    createdAt: 0,
    expiresAt: 1,
    requestedBy: { kind: "user", userId: "user_1" },
    runId: "run_1" as Id<"runs">,
    status: "pending",
    summary: "Create a page.",
    surface: "notion",
    tenantId: "tenant",
    tool: "notion_create_page",
  }
}

function integrationDoc(): Doc<"integrations"> {
  return {
    _creationTime: 0,
    _id: "integration_1" as Id<"integrations">,
    createdAt: 0,
    createdBy: "user_1",
    credentials: {},
    externalId: "linear-org",
    integration: "linear",
    scope: "tenant",
    status: "active",
    tenantId: "tenant",
    updatedAt: 0,
  }
}
