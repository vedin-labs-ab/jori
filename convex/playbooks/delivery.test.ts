import { expect, test } from "vitest"
import { getPlaybook } from "../../contracts/playbooks/catalog"
import { type Integration } from "../shared/integrations"
import { type DeliveryContext, deliverySetup } from "./delivery"

const morningBrief = getPlaybook("morning-brief")

test("prefers a linked self Slack DM before email", () => {
  const setup = deliverySetup(
    morningBrief,
    context(["gmail", "slack"], { hasSlackIdentity: true })
  )

  expect(setup.recommended).toEqual({
    kind: "slack",
    target: { kind: "dm" },
  })
})

test("a valid manual preference takes priority", () => {
  const preference = {
    kind: "slack" as const,
    target: { kind: "channel" as const, id: "C1", label: "leadership" },
  }
  const setup = deliverySetup(
    morningBrief,
    context(["gmail", "slack"], { hasSlackIdentity: true, preference })
  )

  expect(setup.recommended).toEqual(preference)
})

test("an unavailable preference falls back without choosing a channel", () => {
  const setup = deliverySetup(
    morningBrief,
    context(["gmail"], {
      preference: {
        kind: "slack",
        target: { kind: "channel", id: "C1", label: "leadership" },
      },
    })
  )

  expect(setup.recommended).toEqual({ kind: "email" })
})

test("Slack channel stays available but is never inferred", () => {
  const setup = deliverySetup(
    morningBrief,
    context(["slack"], { recipient: {} })
  )

  expect(setup.recommended).toBeUndefined()
  expect(setup.options).toEqual([
    {
      mode: "dm",
      available: false,
      reason: "No Slack identity linked",
    },
    {
      mode: "email",
      available: false,
      reason: "Connect an email account",
    },
    { mode: "channel", available: true },
  ])
})

function context(
  connected: Integration[],
  overrides: Partial<DeliveryContext> = {}
): DeliveryContext {
  return {
    connected: new Set(connected),
    hasSlackIdentity: false,
    recipient: { email: "sam@example.com", name: "Sam" },
    ...overrides,
  }
}
