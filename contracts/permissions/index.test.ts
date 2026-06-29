import { describe, expect, test } from "vitest"
import { integrations, toolSurfaces } from "../integrations"
import { toolPermissions } from "."

const communicationToolNames = [
  "conversations_add_message",
  "slack_add_reaction",
  "linear_add_comment",
  "linear_add_reaction",
  "github_add_issue_comment",
  "github_reply_to_pull_request_review_comment",
  "github_add_comment_reaction",
  "google_gmail_reply_to_thread",
  "google_gmail_send_message",
  "notion_create_comment",
  "microsoft_email_send_message",
] as const

const communicationTools = new Set<string>(communicationToolNames)

describe("permission catalog", () => {
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

  test("defaults integration tools by communication policy", () => {
    const integrationSurfaces = new Set<string>(integrations)

    for (const permission of toolPermissions) {
      if (!integrationSurfaces.has(permission.surface)) {
        continue
      }

      expect(permission.defaultMode).toBe(
        communicationTools.has(permission.tool) ? "required" : "allowed"
      )
    }
  })

  test("requires communication tools", () => {
    const permissionsByTool = new Map(
      toolPermissions.map((permission) => [permission.tool, permission])
    )

    for (const tool of communicationToolNames) {
      expect(permissionsByTool.get(tool)?.defaultMode).toBe("required")
    }
  })
})
