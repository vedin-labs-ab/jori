// @vitest-environment jsdom
import { describe, expect, test } from "vitest"
import { type AutomationFormValues, emptyAutomationForm } from "../../types"
import { createAutomationArgs } from "."

describe("automation event payload criteria", () => {
  test("creates event automation args with required option criteria", () => {
    expect(
      createAutomationArgs(
        eventForm({
          name: "Watch support",
          instructions: "Read Slack and post to Slack.",
          eventIntegration: "slack",
          event: "message.created",
          eventCriteria: { channel: "C123" },
          surfaces: [{ integration: "slack", tools: slackTools() }],
        })
      )
    ).toMatchObject({
      args: {
        type: "event",
        trigger: {
          integration: "slack",
          event: "message.created",
          criteria: { channel: "C123" },
        },
      },
    })
  })

  test("creates event automation args with multiple criteria", () => {
    expect(createAutomationArgs(githubReviewForm())).toMatchObject({
      args: {
        type: "event",
        trigger: {
          integration: "github",
          event: "pull_request.review_comment.edited",
          criteria: {
            repo: "milo/app",
            pr: "42",
            path: "src/app.ts",
          },
        },
      },
    })
  })
})

describe("automation event payload validation", () => {
  test("requires event criteria declared by the catalog", () => {
    expect(
      createAutomationArgs(
        eventForm({
          name: "Watch support",
          instructions: "Read Slack and post to Slack.",
          eventIntegration: "slack",
          event: "message.created",
          eventCriteria: {},
          surfaces: [{ integration: "slack", tools: slackTools() }],
        })
      )
    ).toEqual({ error: "Channel is required." })
  })

  test("rejects unavailable event-triggered automations", () => {
    expect(
      createAutomationArgs(
        eventForm({
          name: "Watch inbox",
          instructions: "Read Gmail and draft with Gmail.",
          eventIntegration: "gmail",
          event: "message.received",
          eventCriteria: { from: "person@example.com" },
          surfaces: [
            {
              integration: "gmail",
              tools: ["google_gmail_get_message", "google_gmail_send_message"],
            },
          ],
        })
      )
    ).toEqual({
      error:
        "Gmail event-triggered automations need mailbox subscriptions before they can run.",
    })
  })

  test("rejects unsupported integration events", () => {
    expect(
      createAutomationArgs(
        eventForm({
          name: "Watch support",
          instructions: "Read Slack and post to Slack.",
          eventIntegration: "slack",
          event: "page.updated",
          eventCriteria: { channel: "C123" },
          surfaces: [{ integration: "slack", tools: slackTools() }],
        })
      )
    ).toEqual({ error: "Choose a supported automation event." })
  })
})

function githubReviewForm() {
  return eventForm({
    name: "Watch PR reviews",
    instructions: "Read GitHub and post to Slack.",
    eventIntegration: "github",
    event: "pull_request.review_comment.edited",
    eventCriteria: {
      repo: "milo/app",
      pr: "42",
      path: "src/app.ts",
    },
    surfaces: [
      { integration: "github", tools: ["github_get_issue"] },
      { integration: "slack", tools: ["conversations_add_message"] },
    ],
  })
}

function slackTools() {
  return ["conversations_history", "conversations_add_message"]
}

function eventForm(
  values: Partial<AutomationFormValues>
): AutomationFormValues {
  return {
    ...emptyAutomationForm,
    type: "event",
    ...values,
  }
}
