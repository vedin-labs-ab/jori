import { afterEach, expect, test, vi } from "vitest"
import { encodeJson } from "../../../../contracts/json"
import { integrationDoc } from "../../../../test/convex/integrations"
import { internal } from "../../../_generated/api"
import { type Doc, type Id } from "../../../_generated/dataModel"
import { type ActionCtx } from "../../../_generated/server"
import { hmacSha256Hex, sha256Hex } from "../../../shared/crypto"
import { getGitHubMessage } from "./events"
import { handleGitHubEvents, handleGitHubMessageEvent } from "./http"
import { type GitHubWebhookPayload } from "./types"

afterEach(() => vi.unstubAllEnvs())

test("durably accepts a signed GitHub event before acknowledging without processing it inline", async () => {
  vi.stubEnv("GITHUB_WEBHOOK_SECRET", "test-secret")
  const ctx = actionCtx()
  const request = await webhookRequest()
  expect((await handleGitHubEvents(ctx, request)).status).toBe(200)
  expect(ctx.runMutation).toHaveBeenCalledExactlyOnceWith(
    internal.integrations.webhooks.delivery.accept,
    {
      provider: "github",
      externalId: "123",
      eventId: await sha256Hex(
        JSON.stringify(githubPayload("@jori-eu help", "MEMBER"))
      ),
      payload: {
        event: "issue_comment",
        deliveryId: "delivery",
        payload: githubPayload("@jori-eu help", "MEMBER"),
      },
    }
  )
  expect(ctx.runQuery).not.toHaveBeenCalled()
})

test("changing an unsigned delivery header cannot bypass GitHub deduplication", async () => {
  vi.stubEnv("GITHUB_WEBHOOK_SECRET", "test-secret")
  const ctx = actionCtx()
  await handleGitHubEvents(ctx, await webhookRequest())
  const replay = await webhookRequest()
  replay.headers.set("x-github-delivery", "another-delivery")
  await handleGitHubEvents(ctx, replay)
  expect(ctx.runMutation.mock.calls[0][1].eventId).toEqual(
    ctx.runMutation.mock.calls[1][1].eventId
  )
})

test("rejects forged GitHub events before trusting the installation", async () => {
  vi.stubEnv("GITHUB_WEBHOOK_SECRET", "test-secret")
  const ctx = actionCtx()
  const request = await webhookRequest()
  request.headers.set("x-hub-signature-256", "sha256=forged")
  expect((await handleGitHubEvents(ctx, request)).status).toBe(401)
  expect(ctx.runMutation).not.toHaveBeenCalled()
})

test("does not acknowledge a GitHub delivery when durable acceptance fails", async () => {
  vi.stubEnv("GITHUB_WEBHOOK_SECRET", "test-secret")
  const ctx = actionCtx()
  ctx.runMutation.mockRejectedValue(new Error("storage unavailable"))
  await expect(handleGitHubEvents(ctx, await webhookRequest())).rejects.toThrow(
    "storage unavailable"
  )
})

async function webhookRequest() {
  const body = JSON.stringify(githubPayload("@jori-eu help", "MEMBER"))
  return new Request("https://eu.example/github/events", {
    method: "POST",
    body,
    headers: {
      "x-github-event": "issue_comment",
      "x-github-delivery": "delivery",
      "x-hub-signature-256": `sha256=${await hmacSha256Hex("test-secret", body)}`,
    },
  })
}

test("records GitHub approval commands without starting a message run", async () => {
  const approval = approvalDoc()
  const integration = integrationDoc({
    integration: "github",
    externalId: "123",
  })
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
