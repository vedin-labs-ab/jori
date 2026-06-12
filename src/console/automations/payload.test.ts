// @vitest-environment jsdom
import { afterEach, describe, expect, test } from "vitest"
import { automationFormValues, createAutomationArgs } from "./payload"
import {
  writeAutomationReadScopePreference,
  writeAutomationWebSearchPreference,
} from "./preferences"
import { emptyAutomationForm } from "./types"

afterEach(() => {
  localStorage.clear()
})

describe("automation payload", () => {
  test("defaults new automations to all reads and web search", () => {
    expect(automationFormValues(undefined)).toMatchObject({
      readScope: "allConnected",
      webSearch: true,
    })
  })

  test("uses stored automation access preferences for new automations", () => {
    writeAutomationReadScopePreference("selected")
    writeAutomationWebSearchPreference(false)

    expect(automationFormValues(undefined)).toMatchObject({
      readScope: "selected",
      webSearch: false,
    })
  })

  test("creates automation args with integration access policy", () => {
    expect(
      createAutomationArgs({
        ...emptyAutomationForm,
        name: "Weekly release summary",
        instructions: "Summarize GitHub and post to Slack.",
        readScope: "selected",
        surfaces: [
          { provider: "github", access: "read" },
          { provider: "slack", access: "write" },
        ],
      })
    ).toEqual({
      args: {
        name: "Weekly release summary",
        instructions: "Summarize GitHub and post to Slack.",
        access: {
          read: ["github"],
          write: ["slack"],
          web: true,
        },
        trigger: {
          cron: "0 9 * * *",
          type: "cron",
        },
      },
    })
  })

  test("requires every selected-read marker to have an access role", () => {
    expect(
      createAutomationArgs({
        ...emptyAutomationForm,
        name: "Weekly release summary",
        instructions: "Summarize GitHub.",
        readScope: "selected",
        surfaces: [{ provider: "github", access: "" }],
      })
    ).toEqual({
      error: "Choose read, write, or both for each mentioned integration.",
    })
  })

  test("requires at least one write integration", () => {
    expect(
      createAutomationArgs({
        ...emptyAutomationForm,
        name: "Weekly release summary",
        instructions: "Summarize GitHub.",
        surfaces: [{ provider: "github", access: "read" }],
      })
    ).toEqual({
      error: "At least one integration needs write access.",
    })
  })
})
