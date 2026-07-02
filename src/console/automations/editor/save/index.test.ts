// @vitest-environment jsdom
import { afterEach, describe, expect, test } from "vitest"
import { emptyAutomationForm } from "../../types"
import { writeAutomationWebSearchPreference } from "../preferences"
import { automationFormValues, createAutomationArgs } from "."
import { automationInstructionMarkerErrors } from "./marker"

afterEach(() => {
  localStorage.clear()
})

describe("automation payload", () => {
  test("defaults new automations to web search", () => {
    expect(automationFormValues(undefined)).toMatchObject({
      webSearch: true,
    })
  })

  test("uses stored automation access preferences for new automations", () => {
    writeAutomationWebSearchPreference(false)

    expect(automationFormValues(undefined)).toMatchObject({
      webSearch: false,
    })
  })

  test("creates automation args with integration access policy", () => {
    expect(
      createAutomationArgs(
        {
          ...emptyAutomationForm,
          name: "Weekly release summary",
          instructions: "Summarize GitHub and post to Slack.",
          surfaces: [
            { integration: "github", tools: ["github_get_issue"] },
            { integration: "slack", tools: ["conversations_add_message"] },
          ],
        },
        { permissions: automationPermissions() }
      )
    ).toEqual({
      args: {
        name: "Weekly release summary",
        instructions: "Summarize GitHub and post to Slack.",
        access: {
          integrations: [
            { integration: "github", tools: ["github_get_issue"] },
            { integration: "slack", tools: ["conversations_add_message"] },
          ],
          web: true,
        },
        type: "cron",
        trigger: {
          expression: "0 9 * * *",
        },
      },
    })
  })

  test("requires every marker to have at least one selected tool", () => {
    expect(
      createAutomationArgs({
        ...emptyAutomationForm,
        name: "Weekly release summary",
        instructions: "Summarize GitHub.",
        surfaces: [{ integration: "github", tools: [] }],
      })
    ).toEqual({
      error: "Choose at least one tool for each mentioned integration.",
    })
  })

  test("requires at least one write tool", () => {
    expect(
      createAutomationArgs(
        {
          ...emptyAutomationForm,
          name: "Weekly release summary",
          instructions: "Summarize GitHub.",
          surfaces: [{ integration: "github", tools: ["github_get_issue"] }],
        },
        { permissions: automationPermissions() }
      )
    ).toEqual({
      error: "Give at least one mentioned integration a write tool.",
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
          surfaces: [
            { integration: "github", tools: ["github_get_issue"] },
            { integration: "slack", tools: ["conversations_add_message"] },
          ],
        },
        {
          permissions: [
            toolPermission({
              access: "read",
              mode: "prompted",
              surface: "github",
              tool: "github_get_issue",
            }),
            toolPermission({
              access: "write",
              mode: "allowed",
              surface: "slack",
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

function automationPermissions() {
  return [
    toolPermission({
      access: "read",
      surface: "github",
      tool: "github_get_issue",
    }),
    toolPermission({
      access: "write",
      surface: "slack",
      tool: "conversations_add_message",
    }),
  ]
}

function toolPermission(
  overrides: Partial<{
    access: "read" | "write"
    mode: "required" | "allowed" | "prompted" | "blocked"
    surface: "github" | "slack"
    tool: string
  }>
) {
  return {
    access: overrides.access ?? "read",
    description: "Tool",
    usage: "Use tool.",
    label: "Tool",
    mode: overrides.mode ?? "allowed",
    overrideMode: null,
    route: "broker" as const,
    surface: overrides.surface ?? "github",
    tool: overrides.tool ?? "github_get_issue",
  }
}
