import { expect, test } from "vitest"
import { type Id } from "../../_generated/dataModel"
import {
  isSlackSetupLinkInteraction,
  parseSlackSetupLinkCancelInteraction,
} from "./interaction"
import { createSlackSetupLinkMessage } from "./slack"

test("renders a URL button for the requested integration", () => {
  const setupLinkId = "setup-link" as Id<"setupLinks">
  const message = createSlackSetupLinkMessage({
    expiresAt: 1_700_000_000_000,
    integration: "github",
    setupLinkId,
    summary: "GitHub is needed before I can inspect the repository.",
    url: "https://app.milo.example/integrations/setup/token",
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
        text: "Connection request",
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
          action_id: "milo_setup_link_cancel",
          value: JSON.stringify({ setupLinkId }),
        },
        {
          type: "button",
          action_id: "milo_setup_link_open",
          url: "https://app.milo.example/integrations/setup/token",
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

test("renders connected updates without the setup button", () => {
  const message = createSlackSetupLinkMessage({
    expiresAt: 1_700_000_000_000,
    integration: "gmail",
    status: "connected",
    summary: "Gmail is needed before I can handle email tasks.",
    updatedAt: 1_699_999_000_000,
  })
  const card = message.blocks[0] as Record<string, unknown>

  expect(message.text).toContain("Gmail connected to Milo")
  expect(message.blocks).toHaveLength(1)
  expect(card).not.toHaveProperty("actions")
  expect(card.title).toMatchObject({
    type: "mrkdwn",
    text: "Connection complete",
  })
  expect(JSON.stringify(card.subtext)).toContain(
    "Connected at <!date^1699999000^{time}|"
  )
  expect(JSON.stringify(card.subtext)).not.toContain("manage")
})

test("renders cancelled updates without setup actions", () => {
  const message = createSlackSetupLinkMessage({
    actor: {
      kind: "user",
      externalId: "U123",
      name: "Albin Vedin",
    },
    expiresAt: 1_700_000_000_000,
    integration: "googleDrive",
    status: "cancelled",
    summary: "Google Drive is needed before I can read files.",
    updatedAt: 1_699_999_000_000,
  })
  const card = message.blocks[0] as Record<string, unknown>
  const subtext = card.subtext as { text: string }

  expect(message.text).toContain("Google Drive setup offer cancelled by Albin")
  expect(card).not.toHaveProperty("actions")
  expect(card.title).toMatchObject({
    type: "mrkdwn",
    text: "Cancelled by Albin Vedin",
  })
  expect(card.subtitle).toMatchObject({
    type: "mrkdwn",
    text: "Connect Google Drive",
  })
  expect(subtext.text).toContain("Cancelled at <!date^1699999000^{time}|")
  expect(subtext.text).not.toContain("Ask Milo")
  expect(subtext.text.endsWith(".")).toBe(false)
})

test("renders terminal setup timestamps as footnotes", () => {
  const failed = createSlackSetupLinkMessage({
    expiresAt: 1_700_000_000_000,
    integration: "googleDrive",
    status: "failed",
    summary: "Google Drive is needed before I can read files.",
    updatedAt: 1_699_999_000_000,
  }).blocks[0] as Record<string, unknown>
  const expired = createSlackSetupLinkMessage({
    expiresAt: 1_700_000_000_000,
    integration: "googleDrive",
    status: "expired",
    summary: "Google Drive is needed before I can read files.",
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

test("keeps setup card bodies within card limits", () => {
  const message = createSlackSetupLinkMessage({
    expiresAt: 1_700_000_000_000,
    integration: "googleCalendar",
    summary: "A".repeat(240),
    url: "https://app.milo.example/integrations/setup/token",
  })
  const card = message.blocks[0] as Record<string, unknown>
  const body = card.body as { text: string }

  expect(body.text).toHaveLength(200)
  expect(body.text.endsWith("...")).toBe(true)
})

test("parses setup cancellation interactions", () => {
  const setupLinkId = "setup-link" as Id<"setupLinks">

  expect(
    parseSlackSetupLinkCancelInteraction({
      type: "block_actions",
      team: { id: "T123" },
      user: { id: "U123" },
      channel: { id: "C123" },
      message: { ts: "1710000000.000100" },
      actions: [
        {
          action_id: "milo_setup_link_cancel",
          value: JSON.stringify({ setupLinkId }),
        },
      ],
    })
  ).toEqual({
    accountId: "T123",
    actorId: "U123",
    channelId: "C123",
    messageTs: "1710000000.000100",
    setupLinkId,
  })
})

test("recognizes setup URL button interactions", () => {
  expect(
    isSlackSetupLinkInteraction({
      actions: [{ action_id: "milo_setup_link_open" }],
    })
  ).toBe(true)
  expect(
    isSlackSetupLinkInteraction({
      actions: [{ action_id: "other" }],
    })
  ).toBe(false)
})
