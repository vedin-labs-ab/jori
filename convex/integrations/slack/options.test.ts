import { afterEach, expect, test, vi } from "vitest"
import { id } from "../../../test/convex/database"
import { integrationDoc } from "../../../test/convex/integrations"
import { type Doc } from "../../_generated/dataModel"
import { searchSlackUsers } from "./options"

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
  vi.restoreAllMocks()
})

test("returns active human Slack users with compact identity details", async () => {
  mockSlackUsers([
    slackUser("U1", "sam", "Sam Doe", "sam@example.com"),
    { ...slackUser("U2", "old", "Old User"), deleted: true },
    { ...slackUser("U3", "helper", "Helper"), is_bot: true },
    { ...slackUser("U4", "app", "App"), is_app_user: true },
    slackUser("UBOT", "jori", "Jori"),
  ])

  const options = await searchSlackUsers({
    integration: slackIntegration(),
    match: undefined,
    query: "sam",
  })

  expect(options).toEqual([
    {
      value: "U1",
      label: "Sam Doe",
      description: "@sam - sam@example.com",
    },
  ])
})

test("paginates until a matching Slack user is found", async () => {
  const calls: string[] = []
  let page = 0

  globalThis.fetch = vi.fn(async (input) => {
    calls.push(String(input))
    page += 1

    return Response.json(
      page === 1
        ? {
            ok: true,
            members: [slackUser("U1", "sam", "Sam Doe")],
            response_metadata: { next_cursor: "next" },
          }
        : {
            ok: true,
            members: [slackUser("U2", "alex", "Alex Smith")],
          }
    )
  })

  const options = await searchSlackUsers({
    integration: slackIntegration(),
    match: undefined,
    query: "alex",
  })

  expect(options).toMatchObject([{ value: "U2", label: "Alex Smith" }])
  expect(calls).toHaveLength(2)
  expect(calls[1]).toContain("cursor=next")
})

function mockSlackUsers(members: Record<string, unknown>[]) {
  globalThis.fetch = vi.fn(async () => Response.json({ ok: true, members }))
}

function slackUser(id: string, name: string, realName: string, email?: string) {
  return {
    id,
    name,
    real_name: realName,
    profile: { email, real_name: realName },
  }
}

function slackIntegration(): Doc<"integrations"> {
  return integrationDoc({
    _id: id<"integrations">("slack"),
    integration: "slack",
    externalId: "team",
    credentials: {
      bot: {
        access: "bot-token",
        refresh: "bot-refresh",
        expiresAt: Date.now() + 3_600_000,
      },
      user: {
        access: "user-token",
        refresh: "user-refresh",
        expiresAt: Date.now() + 3_600_000,
      },
    },
    data: { botUserId: "UBOT" },
  })
}
