import { expect, test, vi } from "vitest"
import { type Id } from "../_generated/dataModel"
import { type QueryLikeCtx } from "../shared/context"
import { resolveDestination } from "./destination"

const personId = "person" as Id<"persons">

test("resolves self Slack DM from the current person's identity", async () => {
  const destination = await resolveDestination(
    identityContext([
      { provider: "slack", externalId: "U123", name: "Sam Doe" },
    ]),
    { kind: "slack", target: { kind: "dm" } },
    {
      connected: new Set(["slack"]),
      createdBy: personId,
      emailProvider: undefined,
      recipient: { name: "Sam" },
    }
  )

  expect(destination).toEqual({
    kind: "slack",
    target: { kind: "dm", id: "U123", label: "Sam Doe" },
  })
})

test("rejects self Slack DM without one linked identity", async () => {
  await expect(
    resolveDestination(
      identityContext([]),
      { kind: "slack", target: { kind: "dm" } },
      {
        connected: new Set(["slack"]),
        createdBy: personId,
        emailProvider: undefined,
        recipient: { name: "Sam" },
      }
    )
  ).rejects.toThrow("Link your Slack identity")
})

test("email delivery requires the current user's address", async () => {
  await expect(
    resolveDestination(
      identityContext([]),
      { kind: "email" },
      {
        connected: new Set(["gmail"]),
        createdBy: personId,
        emailProvider: "gmail",
        recipient: {},
      }
    )
  ).rejects.toThrow("needs an email address")
})

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
