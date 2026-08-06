import { expect, test } from "vitest"
import { getPlaybook } from "../../contracts/playbooks/catalog"
import { digestDelivery } from "../../contracts/playbooks/delivery"
import { type Integration } from "../shared/integrations"
import { type DeliveryContext, deliverySetup } from "./delivery"

// These tests pin resolution for the digest contract, email or Slack with
// both targets open, so the fixture owns its delivery shape instead of
// borrowing whichever catalog playbook happens to ship it.
const digestPlaybook = {
  ...getPlaybook("meeting-briefing"),
  delivery: { ...digestDelivery, noun: "brief" },
}

test("prefers a linked self Slack DM before email", () => {
  const setup = deliverySetup(
    digestPlaybook,
    context(["gmail", "slack"], { slackDmLabel: "Albin Vedin" })
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
    digestPlaybook,
    context(["gmail", "slack"], { slackDmLabel: "Albin Vedin", preference })
  )

  expect(setup.recommended).toEqual(preference)
})

test("an unavailable preference falls back without choosing a channel", () => {
  const setup = deliverySetup(
    digestPlaybook,
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
    digestPlaybook,
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

    recipient: { email: "sam@example.com", name: "Sam" },
    ...overrides,
  }
}
