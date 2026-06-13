// @vitest-environment jsdom
import { afterEach, describe, expect, test } from "vitest"
import { emptyAutomationForm } from "../../types"
import {
  writeAutomationReadScopePreference,
  writeAutomationWebSearchPreference,
} from "../preferences"
import { automationFormValues, createAutomationArgs } from "."
import { automationInstructionMarkerErrors } from "./marker"

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
      error: "Choose read, write, or read/write for each mention.",
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
      error: "Give at least one mentioned integration write access.",
    })
  })
})

describe("automation payload permissions", () => {
  test("rejects automation access blocked by tool permissions", () => {
    expect(
      createAutomationArgs(
        {
          ...emptyAutomationForm,
          name: "Weekly release summary",
          instructions: "Summarize GitHub and post to Slack.",
          readScope: "selected",
          surfaces: [
            { provider: "github", access: "read" },
            { provider: "slack", access: "write" },
          ],
        },
        {
          permissions: [
            toolPermission({
              access: "read",
              mode: "prompted",
              provider: "github",
              tool: "github_get_issue",
            }),
            toolPermission({
              access: "write",
              mode: "allowed",
              provider: "slack",
              tool: "conversations_add_message",
            }),
          ],
        }
      )
    ).toEqual({
      error: automationInstructionMarkerErrors.unavailableAccess,
    })
  })
})

function toolPermission(
  overrides: Partial<{
    access: "read" | "write"
    mode: "required" | "allowed" | "prompted" | "blocked"
    provider: "github" | "slack"
    tool: string
  }>
) {
  return {
    access: overrides.access ?? "read",
    description: "Tool",
    label: "Tool",
    mode: overrides.mode ?? "allowed",
    overrideMode: null,
    provider: overrides.provider ?? "github",
    tool: overrides.tool ?? "github_get_issue",
  }
}
