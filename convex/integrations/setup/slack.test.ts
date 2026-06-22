import { describe, expect, test } from "vitest"
import {
  createSlackSetupLinkMessage,
  isSlackSetupLinkInteraction,
} from "./slack"

describe("Slack setup link message", () => {
  test("renders a URL button for the requested integration", () => {
    const message = createSlackSetupLinkMessage({
      integration: "github",
      url: "https://app.milo.example/integrations/setup/token",
    })

    expect(message.text).toContain("Set up GitHub")
    expect(message.blocks).toMatchObject([
      {
        type: "section",
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
    ])
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
