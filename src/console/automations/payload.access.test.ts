// @vitest-environment jsdom
import { describe, expect, test } from "vitest"
import { createAutomationArgs } from "./payload"
import { emptyAutomationForm } from "./types"

describe("automation payload all-read access", () => {
  test("promotes write-only markers when all reads are enabled", () => {
    expect(
      createAutomationArgs({
        ...emptyAutomationForm,
        name: "Weekly release summary",
        instructions: "Summarize GitHub and post to Slack.",
        readScope: "allConnected",
        surfaces: [
          { provider: "github", access: "read" },
          { provider: "slack", access: "write" },
        ],
      })
    ).toMatchObject({
      args: {
        access: {
          read: "all",
          write: ["slack"],
        },
      },
    })
  })
})
