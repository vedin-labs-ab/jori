import { expect, test } from "vitest"
import { createExecutionToolSnapshot } from "./snapshot"

test("stores connected-provider tool capabilities for execution details", () => {
  expect(
    createExecutionToolSnapshot({
      webSearch: true,
      capabilities: [
        {
          provider: "milo",
          label: "Milo",
          tools: ["Save artifact"],
        },
        {
          provider: "slack",
          label: "Slack",
          tools: ["Send message", "Read channel history"],
        },
      ],
    })
  ).toEqual({
    groups: [
      {
        provider: "slack",
        label: "Slack",
        tools: ["Send message", "Read channel history"],
      },
    ],
    webSearch: true,
  })
})
