import { expect, test, vi } from "vitest"
import { encodeJson } from "../../../../contracts/json"
import { internal } from "../../../_generated/api"
import { type Doc, type Id } from "../../../_generated/dataModel"
import { type ActionCtx } from "../../../_generated/server"
import { getGitHubMessage } from "./events"
import { handleGitHubMessageEvent } from "./http"
import { type GitHubWebhookPayload } from "./types"

test("records GitHub approval commands without starting a message run", async () => {
  const approval = approvalDoc()
  const integration = integrationDoc()
  const ctx = actionCtx({
    decisionResult: { approval, status: "approved" as const },
    queryResult: { approval, integration },
  })

  await handleGitHubMessageEvent(
    ctx,
    githubMessage({ body: "approve abc12345" })
  )

  expect(ctx.runMutation).toHaveBeenCalledTimes(2)
  expect(ctx.runMutation.mock.calls[0]?.[1]).toMatchObject({
    accountId: "123",
    mode: "record",
    text: "approve abc12345",
  })
  expect(ctx.runQuery).toHaveBeenCalledWith(expect.anything(), {
    accountId: "123",
    code: "ABC12345",
    integration: "github",
  })
  expect(ctx.runMutation.mock.calls[1]?.[1]).toMatchObject({
    approvalId: approval._id,
    decidedBy: {
      externalId: "49404620",
      kind: "person",
      name: "albinvedin",
    },
    decision: "approved",
  })
})

test("ignores approval commands from commenters outside the repository audience", async () => {
  const ctx = actionCtx()

  await handleGitHubMessageEvent(
    ctx,
    githubMessage({ body: "approve abc12345", authorAssociation: "NONE" })
  )

  expect(ctx.runMutation).toHaveBeenCalledTimes(1)
  expect(ctx.runMutation.mock.calls[0]?.[1]).toMatchObject({
    accountId: "123",
    text: "approve abc12345",
  })
  expect(ctx.runMutation.mock.calls[0]?.[1]).not.toHaveProperty("mode")
  expect(ctx.runQuery).not.toHaveBeenCalled()
})

test("records ordinary GitHub comments with normal run intake", async () => {
  const ctx = actionCtx()

  await handleGitHubMessageEvent(ctx, githubMessage({ body: "hello jori" }))

  expect(ctx.runMutation).toHaveBeenCalledTimes(1)
  expect(ctx.runMutation.mock.calls[0]?.[1]).toMatchObject({
    accountId: "123",
    text: "hello jori",
  })
  expect(ctx.runMutation.mock.calls[0]?.[1]).not.toHaveProperty("mode")
  expect(ctx.runQuery).not.toHaveBeenCalled()
  expect(ctx.runMutation).toHaveBeenCalledWith(
    internal.integrations.github.ingress.messages.record,
    expect.anything()
  )
})

type GitHubMessage = Parameters<typeof handleGitHubMessageEvent>[1]

function githubMessage(args: {
  body: string
  authorAssociation?: string
}): GitHubMessage {
  const message = getGitHubMessage({
    deliveryId: "delivery",
    event: "issue_comment",
    payload: githubPayload(args.body, args.authorAssociation ?? "MEMBER"),
  })

  if (message === null) {
    throw new Error("GitHub message fixture did not parse.")
  }

  return message
}

function githubPayload(
  body: string,
  authorAssociation: string
): GitHubWebhookPayload {
  return {
    action: "created",
    comment: {
      author_association: authorAssociation,
      body,
      created_at: "2026-06-26T11:07:51Z",
      html_url:
        "https://github.com/vedin-labs-ab/jori/pull/3#issuecomment-4808980612",
      id: 4808980612,
      url: "https://api.github.com/repos/vedin-labs-ab/jori/issues/comments/4808980612",
    },
    installation: { id: 123 },
    issue: {
      html_url: "https://github.com/vedin-labs-ab/jori/pull/3",
      id: 4750750824,
      number: 3,
      pull_request: {},
      title: "Update console to website in PRODUCT.md",
    },
    repository: {
      full_name: "vedin-labs-ab/jori",
      id: 1,
      name: "jori",
      owner: { login: "vedin-labs-ab" },
    },
    sender: {
      id: 49404620,
      login: "albinvedin",
      type: "User",
    },
  }
}

function actionCtx(args: ActionCtxArgs = {}) {
  return {
    runMutation: vi.fn(async (_reference: unknown, input: MutationInput) => {
      if ("decision" in input) {
        return args.decisionResult ?? null
      }

      return { status: "recorded" }
    }),
    runQuery: vi.fn(async () => args.queryResult ?? null),
  } as unknown as ActionCtx & {
    runMutation: ReturnType<typeof vi.fn>
    runQuery: ReturnType<typeof vi.fn>
  }
}

type ActionCtxArgs = {
  decisionResult?: unknown
  queryResult?: unknown
}

type MutationInput = Record<string, unknown>

function approvalDoc(): Doc<"approvals"> {
  return {
    _creationTime: 0,
    _id: "approval_1" as Id<"approvals">,
    args: encodeJson({}),
    code: "ABC12345",
    createdAt: 0,
    expiresAt: 1,
    requestedBy: { kind: "person", personId: "person_1" as Id<"persons"> },
    runId: "run_1" as Id<"runs">,
    status: "pending",
    summary: "Commit the PRODUCT.md wording fix.",
    surface: "github",
    organizationId: "organization",
    tool: "github_commit_to_pull_request",
  }
}

function integrationDoc(): Doc<"integrations"> {
  return {
    _creationTime: 0,
    _id: "integration_1" as Id<"integrations">,
    createdAt: 0,
    createdBy: "person_1" as Id<"persons">,
    credentials: {},
    externalId: "123",
    integration: "github",
    scope: "organization",
    status: "active",
    organizationId: "organization",
    updatedAt: 0,
  }
}
