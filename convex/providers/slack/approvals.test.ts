import { expect, test } from "vitest"
import { type SlackApprovalDecisionResult } from "../../approvals/runtime"
import { createSlackDecisionResponse } from "./approvalBlocks"
import { parseSlackApprovalInteraction } from "./approvals"

test("parses Slack approval button payloads", () => {
  expect(
    parseSlackApprovalInteraction({
      type: "block_actions",
      team: { id: "T123" },
      user: { id: "U123" },
      channel: { id: "C123" },
      message: { ts: "1710000000.000100" },
      response_url: "https://hooks.slack.com/actions/T123/123/abc",
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
    threadTs: "1710000000.000100",
    responseUrl: "https://hooks.slack.com/actions/T123/123/abc",
    code: "ABC12345",
    decision: "approved",
  })
})

test("replaces Slack approval buttons with a decision summary", () => {
  const interaction = parseSlackApprovalInteraction({
    type: "block_actions",
    team: { id: "T123" },
    user: { id: "U123" },
    channel: { id: "C123" },
    actions: [
      {
        action_id: "milo_approval_deny",
        value: JSON.stringify({ code: "ABC12345" }),
      },
    ],
  })

  if (interaction === null) {
    throw new Error("Expected Slack approval interaction")
  }

  const response = createSlackDecisionResponse(interaction, {
    status: "denied",
    message: "Denied.",
    approval: {
      provider: "slack",
      tool: "conversations_add_message",
      summary: "Post a follow-up message in Slack.",
    } as SlackApprovalDecisionResult["approval"],
  })
  const rendered = JSON.stringify(response)

  expect(response.replace_original).toBe(true)
  expect(rendered).toContain("*Denied* by <@U123> at <!date^")
  expect(rendered).toContain("Post a follow-up message in Slack.")
  expect(rendered).toContain("*Tool:* slack.conversations_add_message")
  expect(rendered).not.toContain("ABC12345")
  expect(rendered).not.toContain('"type":"actions"')
})
