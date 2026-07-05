import { expect, test } from "vitest"
import { type Id } from "../../_generated/dataModel"
import {
  isSlackIntegrationOfferInteraction,
  parseSlackIntegrationOfferCancelInteraction,
} from "./interaction"
import { createSlackIntegrationOfferMessage } from "./slack"

test("renders a URL button for the requested integration", () => {
  const integrationOfferId = "integration-offer" as Id<"integrationOffers">
  const message = createSlackIntegrationOfferMessage({
    expiresAt: 1_700_000_000_000,
    integration: "github",
    integrationOfferId,
    summary: "GitHub is needed before I can inspect the repository.",
    url: "https://app.milo.example/integrations/offers/token",
  })
  const card = message.blocks[0] as Record<string, unknown>
  const subtext = card.subtext as { text: string }
  const actions = card.actions as Record<string, unknown>[]

  expect(message.text).toContain("Connect GitHub to Milo")
  expect(message.blocks).toHaveLength(1)
  expect(message.blocks).toMatchObject([
    {
      type: "card",
      slack_icon: {
        type: "icon",
        name: "link",
      },
      title: {
        type: "mrkdwn",
        text: "Integration offer",
      },
      subtitle: {
        type: "mrkdwn",
        text: "Connect GitHub",
      },
      body: {
        type: "mrkdwn",
        text: "GitHub is needed before I can inspect the repository.",
      },
      subtext: {
        type: "mrkdwn",
      },
      actions: [
        {
          type: "button",
          action_id: "milo_integration_offer_cancel",
          value: JSON.stringify({ integrationOfferId }),
        },
        {
          type: "button",
          action_id: "milo_integration_offer_open",
          url: "https://app.milo.example/integrations/offers/token",
        },
      ],
    },
  ])
  expect(subtext.text).toContain("Expires at <!date^1700000000^{time}|")
  expect(subtext.text.endsWith(".")).toBe(false)
  expect(JSON.stringify(card.subtext)).not.toContain("review permissions")
  expect(actions).toHaveLength(2)
  expect(actions[0]).not.toHaveProperty("style")
  expect(actions[1]).toMatchObject({ style: "primary" })
})

test("renders connected updates without the offer button", () => {
  const message = createSlackIntegrationOfferMessage({
    actor: {
      kind: "person",
      personId: "person_123" as Id<"persons">,
      name: "Albin Vedin",
    },
    expiresAt: 1_700_000_000_000,
    integration: "gmail",
    status: "connected",
    summary: "Gmail is needed before I can handle email tasks.",
    updatedAt: 1_699_999_000_000,
  })
  const card = message.blocks[0] as Record<string, unknown>

  expect(message.text).toContain("Gmail connected by Albin Vedin")
  expect(message.blocks).toHaveLength(1)
  expect(card.slack_icon).toEqual({ type: "icon", name: "check" })
  expect(card).not.toHaveProperty("actions")
  expect(card.title).toMatchObject({
    type: "mrkdwn",
    text: "Connected by Albin Vedin",
  })
  expect(JSON.stringify(card.subtext)).toContain(
    "Connected at <!date^1699999000^{time}|"
  )
  expect(JSON.stringify(card.subtext)).not.toContain("manage")
})

test("renders cancelled updates without offer actions", () => {
  const message = createSlackIntegrationOfferMessage({
    actor: {
      kind: "person",
      externalId: "U123",
      name: "Albin Vedin",
    },
    expiresAt: 1_700_000_000_000,
    integration: "notion",
    status: "cancelled",
    summary: "Notion is needed before I can read pages.",
    updatedAt: 1_699_999_000_000,
  })
  const card = message.blocks[0] as Record<string, unknown>
  const subtext = card.subtext as { text: string }

  expect(message.text).toContain("Notion integration offer cancelled by Albin")
  expect(card).not.toHaveProperty("actions")
  expect(card.slack_icon).toEqual({ type: "icon", name: "archive" })
  expect(card.title).toMatchObject({
    type: "mrkdwn",
    text: "Cancelled by Albin Vedin",
  })
  expect(card.subtitle).toMatchObject({
    type: "mrkdwn",
    text: "Connect Notion",
  })
  expect(subtext.text).toContain("Cancelled at <!date^1699999000^{time}|")
  expect(subtext.text).not.toContain("Ask Milo")
  expect(subtext.text.endsWith(".")).toBe(false)
})

test("renders terminal integration offer timestamps as footnotes", () => {
  const failed = createSlackIntegrationOfferMessage({
    expiresAt: 1_700_000_000_000,
    integration: "notion",
    status: "failed",
    summary: "Notion is needed before I can read pages.",
    updatedAt: 1_699_999_000_000,
  }).blocks[0] as Record<string, unknown>
  const expired = createSlackIntegrationOfferMessage({
    expiresAt: 1_700_000_000_000,
    integration: "notion",
    status: "expired",
    summary: "Notion is needed before I can read pages.",
  }).blocks[0] as Record<string, unknown>

  expect(JSON.stringify(failed.subtext)).toContain(
    "Failed at <!date^1699999000^{time}|"
  )
  expect(JSON.stringify(expired.subtext)).toContain(
    "Expired at <!date^1700000000^{time}|"
  )
  expect(JSON.stringify(failed.subtext)).not.toContain("Ask Milo")
  expect(JSON.stringify(expired.subtext)).not.toContain("Ask Milo")
})

test("keeps integration offer card bodies within card limits", () => {
  const message = createSlackIntegrationOfferMessage({
    expiresAt: 1_700_000_000_000,
    integration: "googleCalendar",
    summary: "A".repeat(240),
    url: "https://app.milo.example/integrations/offers/token",
  })
  const card = message.blocks[0] as Record<string, unknown>
  const body = card.body as { text: string }

  expect(body.text).toHaveLength(200)
  expect(body.text.endsWith("...")).toBe(true)
})

test("parses integration offer cancellation interactions", () => {
  const integrationOfferId = "integration-offer" as Id<"integrationOffers">

  expect(
    parseSlackIntegrationOfferCancelInteraction({
      type: "block_actions",
      team: { id: "T123" },
      user: { id: "U123" },
      channel: { id: "C123" },
      message: { ts: "1710000000.000100" },
      actions: [
        {
          action_id: "milo_integration_offer_cancel",
          value: JSON.stringify({ integrationOfferId }),
        },
      ],
    })
  ).toEqual({
    accountId: "T123",
    actorId: "U123",
    channelId: "C123",
    messageTs: "1710000000.000100",
    integrationOfferId,
  })
})

test("recognizes integration offer URL button interactions", () => {
  expect(
    isSlackIntegrationOfferInteraction({
      actions: [{ action_id: "milo_integration_offer_open" }],
    })
  ).toBe(true)
  expect(
    isSlackIntegrationOfferInteraction({
      actions: [{ action_id: "other" }],
    })
  ).toBe(false)
})
