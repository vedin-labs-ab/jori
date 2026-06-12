// @vitest-environment jsdom
import { afterEach, describe, expect, test } from "vitest"
import { createScheduleArgs, scheduleFormValues } from "./payload"
import {
  writeScheduleReadScopePreference,
  writeScheduleWebSearchPreference,
} from "./preferences"
import { emptyScheduleForm } from "./types"

afterEach(() => {
  localStorage.clear()
})

describe("schedule payload", () => {
  test("defaults new schedules to all reads and web search", () => {
    expect(scheduleFormValues(undefined)).toMatchObject({
      readScope: "allConnected",
      webSearch: true,
    })
  })

  test("uses stored schedule access preferences for new schedules", () => {
    writeScheduleReadScopePreference("selected")
    writeScheduleWebSearchPreference(false)

    expect(scheduleFormValues(undefined)).toMatchObject({
      readScope: "selected",
      webSearch: false,
    })
  })

  test("creates schedule args with integration access policy", () => {
    expect(
      createScheduleArgs({
        ...emptyScheduleForm,
        name: "Weekly release summary",
        description: "Summarize GitHub and post to Slack.",
        readScope: "selected",
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
          webSearch: true,
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
      error: "Choose read, write, or both for each mentioned integration.",
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
      error: "At least one integration needs write access.",
    })
  })
})
