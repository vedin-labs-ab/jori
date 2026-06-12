// @vitest-environment jsdom
import { describe, expect, test } from "vitest"
import { createScheduleArgs } from "./payload"
import { emptyScheduleForm } from "./types"

describe("schedule payload all-read access", () => {
  test("promotes write-only markers when all reads are enabled", () => {
    expect(
      createScheduleArgs({
        ...emptyScheduleForm,
        name: "Weekly release summary",
        description: "Summarize GitHub and post to Slack.",
        readScope: "allConnected",
        surfaces: [
          { provider: "github", access: "read" },
          { provider: "slack", access: "write" },
        ],
      })
    ).toMatchObject({
      args: {
        output: {
          readScope: "allConnected",
          surfaces: [
            { provider: "github", access: "read" },
            { provider: "slack", access: "both" },
          ],
        },
      },
    })
  })
})
