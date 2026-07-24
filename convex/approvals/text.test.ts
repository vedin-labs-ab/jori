import { expect, test, vi } from "vitest"
import { encodeToolInput } from "../../contracts/json/transport"
import { type Doc, type Id } from "../_generated/dataModel"
import { type ActionCtx } from "../_generated/server"
import { type Actor } from "../shared/actor"
import {
  decideApprovalByAccount,
  handlePersonTextApprovalDecision,
  isPersonApprovalDecisionText,
} from "./runtime"

test("detects exact user approval commands", () => {
  expect(
    isPersonApprovalDecisionText({
      actorKind: "person",
      text: "approve yd4uefnv",
    })
  ).toBe(true)
  expect(
    isPersonApprovalDecisionText({
      actorKind: "bot",
      text: "approve yd4uefnv",
    })
  ).toBe(false)
  expect(
    isPersonApprovalDecisionText({
      actorKind: "person",
      text: "@milo approve yd4uefnv",
    })
  ).toBe(false)
})

test("resolves text decisions by integration account", async () => {
  const approval = approvalDoc()
  const integration = integrationDoc("linear")
  const ctx = actionCtx(
    async () => ({ approval, status: "approved" as const }),
    async () => ({ approval, integration })
  )

  const result = await decideApprovalByAccount(ctx, {
    accountId: "linear-org",
    actor: userActor(),
    code: "abc12345",
    decision: "approved",
    integration: "linear",
  })

  expect(result).toMatchObject({
    approval,
    integration,
    status: "approved",
  })
  expect(ctx.runQuery).toHaveBeenCalledWith(expect.anything(), {
    accountId: "linear-org",
    code: "ABC12345",
    integration: "linear",
  })
})

test("handles provider text decisions through the shared path", async () => {
  const approval = approvalDoc()
  const integration = integrationDoc("github")
  const ctx = actionCtx(
    async () => ({ approval, status: "approved" as const }),
    async () => ({ approval, integration })
  )

  const handled = await handlePersonTextApprovalDecision(ctx, {
    accountId: "github-installation",
    actor: {
      externalId: "49404620",
      kind: "person",
      name: "albinvedin",
    },
    actorKind: "person",
    integration: "github",
    text: "approve abc12345",
  })

  expect(handled).toBe(true)
  expect(ctx.runQuery).toHaveBeenCalledWith(expect.anything(), {
    accountId: "github-installation",
    code: "ABC12345",
    integration: "github",
  })
  expect(ctx.runMutation).toHaveBeenCalledWith(expect.anything(), {
    approvalId: approval._id,
    decidedBy: {
      externalId: "49404620",
      kind: "person",
      name: "albinvedin",
    },
    decision: "approved",
  })
})

test("ignores bot-authored provider text commands", async () => {
  const ctx = actionCtx(async () => null)

  const handled = await handlePersonTextApprovalDecision(ctx, {
    accountId: "github-installation",
    actor: {
      externalId: "292075993",
      kind: "bot",
      name: "meet-milo[bot]",
    },
    actorKind: "bot",
    integration: "github",
    text: "approve abc12345",
  })

  expect(handled).toBe(false)
  expect(ctx.runQuery).not.toHaveBeenCalled()
  expect(ctx.runMutation).not.toHaveBeenCalled()
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

function integrationDoc(
  integration: Doc<"integrations">["integration"]
): Doc<"integrations"> {
  return {
    _creationTime: 0,
    _id: "integration_1" as Id<"integrations">,
    createdAt: 0,
    createdBy: "person_1" as Id<"persons">,
    credentials: {},
    externalId: "linear-org",
    integration,
    scope: "organization",
    status: "active",
    organizationId: "organization",
    updatedAt: 0,
  }
}
