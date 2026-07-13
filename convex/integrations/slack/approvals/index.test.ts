import { expect, test } from "vitest"
import { type Doc, type Id } from "../../../_generated/dataModel"
import { parseSlackApprovalInteraction } from "."
import { createSlackApprovalRequest } from "./blocks"
import { createSlackApprovalSurfaceMessage } from "./surface"

test("parses Slack approval button payloads", () => {
  expect(
    parseSlackApprovalInteraction({
      type: "block_actions",
      team: { id: "T123" },
      user: { id: "U123" },
      channel: { id: "C123" },
      message: { ts: "1710000000.000100" },
      actions: [
        {
          action_id: "milo_approval_approve",
          value: JSON.stringify({ code: "abc12345" }),
        },
      ],
    })
  ).toEqual({
    accountId: "T123",
    actorId: "U123",
    channelId: "C123",
    messageTs: "1710000000.000100",
    threadTs: "1710000000.000100",
    code: "ABC12345",
    decision: "approved",
  })
})

test("renders Slack approval requests as compact cards", () => {
  const summary = "Create a new Notion page under Customer Discovery."
  const request = createSlackApprovalRequest({
    code: "ABC12345",
    surface: "notion",
    tool: "notion_create_page",
    summary,
    expiresAt: 1_710_000_000_000,
  })
  const card = request.blocks[0] as Record<string, unknown>
  const actions = card.actions as Record<string, unknown>[]

  expect(card.type).toBe("card")
  expect(card.slack_icon).toEqual({ type: "icon", name: "edit" })
  expect(card.title).toMatchObject({
    type: "mrkdwn",
    text: "Approval required",
  })
  expect(card.subtitle).toMatchObject({
    type: "mrkdwn",
    text: "Create Notion page",
  })
  expect(card.body).toMatchObject({ type: "mrkdwn" })
  expect(JSON.stringify(card.body)).toContain(
    "Create a new Notion page under Customer Discovery."
  )
  expect(JSON.stringify(request.text)).toContain(summary)
  expect(card.subtext).toMatchObject({
    type: "mrkdwn",
  })
  expect(JSON.stringify(card.subtext)).toContain(
    "Expires at <!date^1710000000^{time}|"
  )
  expect(JSON.stringify(card.body)).not.toContain("Expires at")
  expect(actions.map((action) => action.action_id)).toEqual([
    "milo_approval_deny",
    "milo_approval_approve",
  ])
  expect(actions[0]).not.toHaveProperty("style")
  expect(actions[1]).toMatchObject({ style: "primary" })
})

test("keeps Slack approval card bodies within card limits", () => {
  const request = createSlackApprovalRequest({
    code: "ABC12345",
    surface: "notion",
    tool: "notion_create_page",
    summary: "A".repeat(240),
    expiresAt: 1_710_000_000_000,
  })
  const card = request.blocks[0] as Record<string, unknown>
  const body = card.body as { text: string }

  expect(body.text).toHaveLength(200)
  expect(body.text.endsWith("...")).toBe(true)
})

test("renders approved delivered approvals with the Milo approver", () => {
  const response = createSlackApprovalSurfaceMessage({
    surface: "notion",
    tool: "notion_create_page",
    summary: "Create a new Notion page.",
    status: "approved",
    decidedAt: 1_710_000_000_000,
    decidedBy: {
      kind: "person",
      personId: "person_123" as Id<"persons">,
      name: "Albin Vedin",
      email: "albin@example.com",
    },
  } as Doc<"approvals">)
  const rendered = JSON.stringify(response)
  const card = response.blocks[0] as Record<string, unknown>

  expect(response.text).toBe("Approved. Milo is continuing the run.")
  expect(card.slack_icon).toEqual({ type: "icon", name: "check" })
  expect(card.title).toMatchObject({
    type: "mrkdwn",
    text: "Approved by Albin Vedin in Milo",
  })
  expect(rendered).toContain("Approved at <!date^1710000000^{time}|")
  expect(rendered).not.toContain("Approved by Albin Vedin in Milo at <!date^")
  expect(rendered).toContain("Create a new Notion page.")
  expect(rendered).not.toContain('"actions"')
})

test("renders denied delivered approvals with the Slack approver", () => {
  const response = createSlackApprovalSurfaceMessage({
    surface: "slack",
    tool: "conversations_add_message",
    summary: "Post a follow-up message in Slack.",
    status: "denied",
    decidedAt: 1_710_000_000_000,
    decidedBy: {
      kind: "person",
      externalId: "U123",
    },
  } as Doc<"approvals">)
  const rendered = JSON.stringify(response)
  const card = response.blocks[0] as Record<string, unknown>

  expect(response.text).toBe("Denied. Milo is continuing without this action.")
  expect(card.slack_icon).toEqual({ type: "icon", name: "thumbs-down" })
  expect(card.title).toMatchObject({
    type: "mrkdwn",
    text: "Denied by U123",
  })
  expect(rendered).toContain("Denied at <!date^1710000000^{time}|")
  expect(rendered).toContain("Post a follow-up message in Slack.")
  expect(rendered).toContain("Send Slack message")
  expect(rendered).not.toContain("Denied by U123 at <!date^")
  expect(rendered).not.toContain('"actions"')
})

test("renders expired delivered approvals without actions", () => {
  const response = createSlackApprovalSurfaceMessage({
    surface: "notion",
    tool: "notion_create_page",
    summary: "Create a new Notion page under Customer Discovery.",
    status: "expired",
    expiresAt: 1_710_000_000_000,
  } as Doc<"approvals">)
  const rendered = JSON.stringify(response)
  const card = response.blocks[0] as Record<string, unknown>

  expect(response.text).toBe("Request expired. Milo skipped this action.")
  expect(card.slack_icon).toEqual({ type: "icon", name: "archive" })
  expect(card.title).toMatchObject({
    type: "mrkdwn",
    text: "Request expired",
  })
  expect(card.subtitle).toMatchObject({
    type: "mrkdwn",
    text: "Create Notion page",
  })
  expect(rendered).toContain(
    "Create a new Notion page under Customer Discovery."
  )
  expect(rendered).toContain("Expired at <!date^1710000000^{time}|")
  expect(rendered).not.toContain("Expires at")
  expect(rendered).not.toContain('"actions"')
})

test("renders cancelled delivered approvals without actions", () => {
  const response = createSlackApprovalSurfaceMessage({
    surface: "notion",
    tool: "notion_create_page",
    summary: "Create a new Notion page.",
    status: "cancelled",
    cancelReason: "No longer needed.",
    cancelledAt: 1_710_000_000_000,
  } as Doc<"approvals">)
  const rendered = JSON.stringify(response)
  const card = response.blocks[0] as Record<string, unknown>

  expect(response.text).toBe("Request cancelled. Milo skipped this action.")
  expect(card.slack_icon).toEqual({ type: "icon", name: "archive" })
  expect(card.title).toMatchObject({ text: "Request cancelled" })
  expect(rendered).toContain("Create a new Notion page.")
  expect(rendered).toContain("Cancelled at <!date^1710000000^{time}|")
  expect(rendered).not.toContain('"actions"')
})
