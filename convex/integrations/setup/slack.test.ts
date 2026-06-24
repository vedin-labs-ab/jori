import { expect, test } from "vitest"
import {
  createSlackSetupLinkMessage,
  isSlackSetupLinkInteraction,
} from "./slack"

test("renders a URL button for the requested integration", () => {
  const message = createSlackSetupLinkMessage({
    expiresAt: 1_700_000_000_000,
    integration: "github",
    iconUrl: "https://app.milo.example/logos/integrations/png/github.png",
    summary: "GitHub is needed before I can inspect the repository.",
    url: "https://app.milo.example/integrations/setup/token",
  })
  const card = message.blocks[0] as Record<string, unknown>
  const actions = card.actions as Record<string, unknown>[]

  expect(message.text).toContain("Connect GitHub to Milo")
  expect(message.blocks).toHaveLength(1)
  expect(message.blocks).toMatchObject([
    {
      type: "card",
      icon: {
        type: "image",
        image_url: "https://app.milo.example/logos/integrations/png/github.png",
        alt_text: "GitHub logo",
      },
      title: {
        type: "mrkdwn",
        text: "Connection required",
      },
      subtitle: {
        type: "mrkdwn",
        text: "GitHub",
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
          action_id: "milo_setup_link_open",
          url: "https://app.milo.example/integrations/setup/token",
        },
      ],
    },
  ])
  expect(JSON.stringify(card.subtext)).toContain(
    "Expires at <!date^1700000000^{time}|"
  )
  expect(actions).toHaveLength(1)
  expect(actions[0]).toMatchObject({ style: "primary" })
})

test("renders connected updates without the setup button", () => {
  const message = createSlackSetupLinkMessage({
    expiresAt: 1_700_000_000_000,
    integration: "gmail",
    iconUrl: "https://app.milo.example/logos/integrations/png/gmail.png",
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
})

test("keeps setup card bodies within card limits", () => {
  const message = createSlackSetupLinkMessage({
    expiresAt: 1_700_000_000_000,
    integration: "googleCalendar",
    iconUrl:
      "https://app.milo.example/logos/integrations/png/google-calendar.png",
    summary: "A".repeat(240),
    url: "https://app.milo.example/integrations/setup/token",
  })
  const card = message.blocks[0] as Record<string, unknown>
  const body = card.body as { text: string }

  expect(body.text).toHaveLength(200)
  expect(body.text.endsWith("...")).toBe(true)
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
