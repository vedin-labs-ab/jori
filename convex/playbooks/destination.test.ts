import { describe, expect, test, vi } from "vitest"
import { getPlaybook } from "../../contracts/playbooks/catalog"
import { type Id } from "../_generated/dataModel"
import { type QueryLikeCtx } from "../shared/context"
import { type Integration } from "../shared/integrations"
import { resolveDestination } from "./destination"

const personId = "person" as Id<"persons">
const delivery = getPlaybook("meeting-briefing").delivery

describe("Meeting Briefing destination", () => {
  test("rejects Slack channels", async () => {
    await expect(
      resolveDestination(
        identityContext([]),
        {
          kind: "slack",
          target: { kind: "channel", id: "C1", label: "team" },
        },
        destinationContext()
      )
    ).rejects.toThrow("Choose an available delivery destination.")
  })

  test("accepts email", async () => {
    await expect(
      resolveDestination(
        identityContext([]),
        { kind: "email" },
        destinationContext()
      )
    ).resolves.toEqual({
      kind: "email",
      integration: "gmail",
      address: "Sam Doe <sam@example.com>",
    })
  })

  test("resolves Slack DM from the current person's identity", async () => {
    const destination = await resolveDestination(
      identityContext([
        { provider: "slack", externalId: "U123", name: "Sam Doe" },
      ]),
      { kind: "slack", target: { kind: "dm" } },
      destinationContext()
    )

    expect(destination).toEqual({
      kind: "slack",
      target: { kind: "dm", id: "U123", label: "Sam Doe" },
    })
  })

  test("rejects Slack DM without one linked identity", async () => {
    await expect(
      resolveDestination(
        identityContext([]),
        { kind: "slack", target: { kind: "dm" } },
        destinationContext()
      )
    ).rejects.toThrow("Link your Slack identity")
  })

  test("email delivery requires the current user's address", async () => {
    await expect(
      resolveDestination(
        identityContext([]),
        { kind: "email" },
        {
          ...destinationContext(),
          recipient: {},
        }
      )
    ).rejects.toThrow("needs an email address")
  })
})

function destinationContext() {
  return {
    connected: new Set<Integration>(["gmail", "slack"]),
    createdBy: personId,
    delivery,
    emailProvider: "gmail" as const,
    recipient: { email: "sam@example.com", name: "Sam Doe" },
  }
}

function identityContext(
  identities: Array<{
    provider: "slack"
    externalId: string
    name?: string
  }>
) {
  const take = vi.fn(async () => identities)
  const withIndex = vi.fn(() => ({ take }))
  const query = vi.fn(() => ({ withIndex }))

  return { db: { query } } as unknown as QueryLikeCtx
}
