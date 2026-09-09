import { type FunctionReference, getFunctionName } from "convex/server"
import { afterEach, expect, test, vi } from "vitest"
import { internal } from "../../../_generated/api"
import { type ActionCtx } from "../../../_generated/server"
import { getActorDisplayName } from "../../../shared/actor"
import { type SlackActorProfile } from "../directory/users"
import { createSlackApprovalActor } from "."

afterEach(() => {
  vi.unstubAllGlobals()
})

test("hydrates Slack approval actors with profile names", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        ok: true,
        user: {
          profile: {
            email: "albin@example.com",
            real_name: "ÅÄÖ 😊",
          },
        },
      })
    )
  )
  const { ctx, token } = context(null)

  const actor = await createSlackApprovalActor(ctx, {
    accountId: "T123",
    actorId: "U123",
  })

  expect(getActorDisplayName(actor)).toBe("ÅÄÖ 😊")
  expect(ctx.runMutation).toHaveBeenCalledWith(expect.anything(), {
    organizationId: "organization_1",
    provider: "slack",
    actor: {
      kind: "person",
      externalId: "U123",
      email: "albin@example.com",
      name: "ÅÄÖ 😊",
    },
  })
  expect(token).toHaveBeenCalledOnce()
})

test("hydrates Slack approval actors from cached identities first", async () => {
  const fetch = vi.fn()
  vi.stubGlobal("fetch", fetch)
  const { ctx, token } = context({
    email: "albin@example.com",
    name: "Albin Vedin",
  })

  const actor = await createSlackApprovalActor(ctx, {
    accountId: "T123",
    actorId: "U123",
  })

  expect(getActorDisplayName(actor)).toBe("Albin Vedin")
  expect(fetch).not.toHaveBeenCalled()
  expect(ctx.runMutation).not.toHaveBeenCalled()
  expect(token).not.toHaveBeenCalled()
})

function context(cached: SlackActorProfile | null) {
  const token = vi.fn(() => "xoxp-user-token")
  const ctx = {
    runMutation: vi.fn(async () => "identity_123"),
    runQuery: async (reference: FunctionReference<"query">) => {
      const name = getFunctionName(reference)

      switch (name) {
        case getFunctionName(
          internal.integrations.slack.install.getProfileLookupTarget
        ):
          return { organizationId: "organization_1" }
        case getFunctionName(
          internal.persons.identity.actors.resolveProviderActorProfileRecord
        ):
          return cached
        case getFunctionName(internal.integrations.slack.install.getUserToken):
          return token()
        default:
          throw new Error(`Unexpected query: ${name}`)
      }
    },
  } as unknown as ActionCtx

  return { ctx, token }
}
