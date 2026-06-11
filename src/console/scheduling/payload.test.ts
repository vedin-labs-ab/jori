import { describe, expect, test } from "vitest"
import { createScheduleArgs } from "./payload"
import { emptyScheduleForm } from "./types"

describe("schedule payload", () => {
  test("creates schedule args with integration access policy", () => {
    expect(
      createScheduleArgs({
        ...emptyScheduleForm,
        name: "Weekly release summary",
        description: "Summarize GitHub and post to Slack.",
        surfaces: [
          { provider: "github", access: "read" },
          { provider: "slack", access: "write" },
        ],
      })
    ).toEqual({
      args: {
        name: "Weekly release summary",
        description: "Summarize GitHub and post to Slack.",
        output: {
          readScope: "selected",
          surfaces: [
            { provider: "github", access: "read" },
            { provider: "slack", access: "write" },
          ],
        },
        schedule: {
          cron: "0 9 * * *",
          type: "recurring",
        },
      },
    })
  })

  test("requires every selected-read marker to have an access role", () => {
    expect(
      createScheduleArgs({
        ...emptyScheduleForm,
        name: "Weekly release summary",
        description: "Summarize GitHub.",
        surfaces: [{ provider: "github", access: "" }],
      })
    ).toEqual({
      error: "Choose read, write, or both for each integration badge.",
    })
  })

  test("requires at least one write integration", () => {
    expect(
      createScheduleArgs({
        ...emptyScheduleForm,
        name: "Weekly release summary",
        description: "Summarize GitHub.",
        surfaces: [{ provider: "github", access: "read" }],
      })
    ).toEqual({
      error: "At least one integration must allow writes.",
    })
  })
})
