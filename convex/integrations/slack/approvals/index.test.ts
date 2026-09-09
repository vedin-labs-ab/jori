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
          action_id: "jori_approval_approve",
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

  expect(request.text).toContain(summary)
  expect(card).toMatchObject({
    type: "card",
    slack_icon: { type: "icon", name: "edit" },
    title: { type: "mrkdwn", text: "Approval required" },
    subtitle: { type: "mrkdwn", text: "Create Notion page" },
    body: { type: "mrkdwn", text: summary },
    subtext: {
      type: "mrkdwn",
      text: expect.stringContaining("Expires at <!date^1710000000^{time}|"),
    },
    actions: [
      { action_id: "jori_approval_deny" },
      { action_id: "jori_approval_approve", style: "primary" },
    ],
  })
  expect(actions[0]).not.toHaveProperty("style")
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

test("renders approved delivered approvals with the Jori approver", () => {
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
  const card = response.blocks[0]

  expect(response.blocks).toHaveLength(1)
  expect(response.text).toBe("Approved. Jori is continuing the run.")
  expect(card).toMatchObject({
    slack_icon: { type: "icon", name: "check" },
    title: { type: "mrkdwn", text: "Approved by Albin Vedin in Jori" },
    body: { text: "Create a new Notion page." },
    subtext: {
      text: expect.stringContaining("Approved at <!date^1710000000^{time}|"),
    },
  })
  expect(card).not.toHaveProperty("actions")
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
  const card = response.blocks[0]

  expect(response.blocks).toHaveLength(1)
  expect(response.text).toBe("Denied. Jori is continuing without this action.")
  expect(card).toMatchObject({
    slack_icon: { type: "icon", name: "thumbs-down" },
    title: { type: "mrkdwn", text: "Denied by U123" },
    subtitle: { text: "Send Slack message" },
    body: { text: "Post a follow-up message in Slack." },
    subtext: {
      text: expect.stringContaining("Denied at <!date^1710000000^{time}|"),
    },
  })
  expect(card).not.toHaveProperty("actions")
})

test("renders expired delivered approvals without actions", () => {
  const response = createSlackApprovalSurfaceMessage({
    surface: "notion",
    tool: "notion_create_page",
    summary: "Create a new Notion page under Customer Discovery.",
    status: "expired",
    expiresAt: 1_710_000_000_000,
  } as Doc<"approvals">)
  const card = response.blocks[0]

  expect(response.blocks).toHaveLength(1)
  expect(response.text).toBe("Request expired. Jori skipped this action.")
  expect(card).toMatchObject({
    slack_icon: { type: "icon", name: "archive" },
    title: { type: "mrkdwn", text: "Request expired" },
    subtitle: { type: "mrkdwn", text: "Create Notion page" },
    body: { text: "Create a new Notion page under Customer Discovery." },
    subtext: {
      text: expect.stringContaining("Expired at <!date^1710000000^{time}|"),
    },
  })
  expect(card?.subtext?.text).not.toContain("Expires at")
  expect(card).not.toHaveProperty("actions")
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
  const card = response.blocks[0]

  expect(response.blocks).toHaveLength(1)
  expect(response.text).toBe("Request cancelled. Jori skipped this action.")
  expect(card).toMatchObject({
    slack_icon: { type: "icon", name: "archive" },
    title: { text: "Request cancelled" },
    body: { text: "Create a new Notion page." },
    subtext: {
      text: expect.stringContaining("Cancelled at <!date^1710000000^{time}|"),
    },
  })
  expect(card).not.toHaveProperty("actions")
})
