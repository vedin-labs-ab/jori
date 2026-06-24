import { describe, expect, test } from "vitest"
import {
  createSlackSetupLinkMessage,
  isSlackSetupLinkInteraction,
} from "./slack"

describe("Slack setup link message", () => {
  test("renders a URL button for the requested integration", () => {
    const message = createSlackSetupLinkMessage({
      expiresAt: 1_700_000_000_000,
      integration: "github",
      logoUrl: "https://app.milo.example/logos/integrations/github.svg",
      summary: "GitHub is needed before I can inspect the repository.",
      url: "https://app.milo.example/integrations/setup/token",
    })

    expect(message.text).toContain("Connect GitHub to Milo")
    expect(message.blocks).toMatchObject([
      {
        type: "section",
        accessory: {
          type: "image",
          image_url: "https://app.milo.example/logos/integrations/github.svg",
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            action_id: "milo_setup_link_open",
            url: "https://app.milo.example/integrations/setup/token",
          },
        ],
      },
      {
        type: "context",
      },
    ])
  })

  test("renders connected updates without the setup button", () => {
    const message = createSlackSetupLinkMessage({
      expiresAt: 1_700_000_000_000,
      integration: "gmail",
      logoUrl: "https://app.milo.example/logos/integrations/gmail.svg",
      status: "connected",
      summary: "Gmail is needed before I can handle email tasks.",
      updatedAt: 1_699_999_000_000,
    })

    expect(message.text).toContain("Gmail connected to Milo")
    expect(message.blocks).toHaveLength(2)
    expect(message.blocks).not.toContainEqual(
      expect.objectContaining({ type: "actions" })
    )
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
})
