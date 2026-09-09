import { describe, expect, test } from "vitest"
import { codingToolNames } from "../coding"
import { integrations, toolSurfaces } from "../integrations"
import {
  internalRequiredToolNames,
  isUserVisibleToolPermission,
  toolPermissions,
} from "."

const permissionsByTool = new Map(
  toolPermissions.map((permission) => [permission.tool, permission])
)

const requiredCommunicationToolNames = [
  "conversations_add_message",
  "slack_add_reaction",
  "linear_add_comment",
  "linear_add_reaction",
  "github_add_issue_comment",
  "github_reply_to_pull_request_review_comment",
  "github_add_comment_reaction",
  "notion_create_comment",
] as const

const allowedEmailCommunicationToolNames = [
  "google_gmail_reply_to_thread",
  "google_gmail_send_message",
  "microsoft_email_send_message",
] as const

const requiredCommunicationTools = new Set<string>(
  requiredCommunicationToolNames
)

const requiredNativeToolNames = [
  "finish_run",
  "send_reply",
  "add_reaction",
  ...codingToolNames,
  "start_agent",
] as const

describe("permission catalog shape", () => {
  test("attaches permissions to tool surfaces, not broad providers", () => {
    const knownSurfaces = new Set<string>(toolSurfaces)
    const permissionSurfaces = new Set<string>(
      toolPermissions.map((permission) => permission.surface)
    )

    expect(permissionSurfaces.has("google")).toBe(false)
    expect(permissionSurfaces.has("microsoft")).toBe(false)

    for (const surface of permissionSurfaces) {
      expect(knownSurfaces.has(surface)).toBe(true)
    }
  })

  test("keeps user-facing description and agent-facing usage distinct", () => {
    for (const permission of toolPermissions) {
      expect(permission.description.trim().length).toBeGreaterThan(0)
      expect(permission.usage.trim().length).toBeGreaterThan(0)
      expect(permission.description).not.toBe(permission.usage)
    }
  })

  test("keeps user-facing descriptions free of internal guidance", () => {
    const leakedDescriptions = toolPermissions
      .filter((permission) =>
        /\/home\/user|<repo>|workspace-relative|args without|cwd|MCP|sandbox/i.test(
          permission.description
        )
      )
      .map((permission) => permission.tool)

    expect(leakedDescriptions).toEqual([])
  })

  test("requires native runtime tools", () => {
    for (const tool of requiredNativeToolNames) {
      expect(permissionsByTool.get(tool)).toEqual(
        expect.objectContaining({
          defaultMode: "required",
          surface: "jori",
        })
      )
    }
  })

  test("marks only internal required tools as hidden from users", () => {
    for (const tool of internalRequiredToolNames) {
      expect(isUserVisibleToolPermission(tool)).toBe(false)
    }

    expect(isUserVisibleToolPermission("git")).toBe(true)
    expect(isUserVisibleToolPermission("start_agent")).toBe(true)
  })
})

describe("permission catalog defaults", () => {
  test("includes communication tools and defaults integration permissions by policy", () => {
    const integrationSurfaces = new Set<string>(integrations)
    const integrationPermissions = toolPermissions.filter((permission) =>
      integrationSurfaces.has(permission.surface)
    )

    expect(integrationPermissions.map((permission) => permission.tool)).toEqual(
      expect.arrayContaining([
        ...requiredCommunicationToolNames,
        ...allowedEmailCommunicationToolNames,
      ])
    )

    for (const permission of integrationPermissions) {
      expect(permission.defaultMode, permission.tool).toBe(
        requiredCommunicationTools.has(permission.tool) ? "required" : "allowed"
      )
    }
  })

  test("documents summarized model reasoning on run activity", () => {
    const activityPermission = permissionsByTool.get("search_run_activity")

    expect(activityPermission?.usage).toContain("Summarized model reasoning")
    expect(activityPermission?.usage).toContain("not a verbatim transcript")
  })

  test("disambiguates calendar event tools", () => {
    const calendarToolLabels = [
      ["google_calendar_list_calendars", "List calendars"],
      ["google_calendar_list_events", "List calendar events"],
      ["google_calendar_get_event", "Read calendar event"],
      ["google_calendar_create_event", "Create calendar event"],
      ["google_calendar_update_event", "Update calendar event"],
      ["microsoft_calendar_list_calendars", "List calendars"],
      ["microsoft_calendar_list_events", "List calendar events"],
      ["microsoft_calendar_get_event", "Read calendar event"],
      ["microsoft_calendar_create_event", "Create calendar event"],
      ["microsoft_calendar_update_event", "Update calendar event"],
    ] as const

    for (const [tool, label] of calendarToolLabels) {
      expect(permissionsByTool.get(tool)?.label).toBe(label)
    }
  })
})
