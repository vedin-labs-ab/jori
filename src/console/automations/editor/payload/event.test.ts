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
          eventProvider: "slack",
          event: "message.created",
          eventCriteria: { channel: "C123" },
          surfaces: [{ provider: "slack", access: "both" }],
        })
      )
    ).toMatchObject({
      args: {
        trigger: {
          type: "event",
          provider: "slack",
          event: "message.created",
          criteria: { channel: "C123" },
        },
      },
    })
  })

  test("creates event automation args with multiple criteria", () => {
    expect(createAutomationArgs(githubReviewForm())).toMatchObject({
      args: {
        trigger: {
          type: "event",
          provider: "github",
          event: "pull_request.review_comment.changed",
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
          eventProvider: "slack",
          event: "message.created",
          eventCriteria: {},
          surfaces: [{ provider: "slack", access: "both" }],
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
          eventProvider: "gmail",
          event: "message.received",
          eventCriteria: { from: "person@example.com" },
          surfaces: [{ provider: "gmail", access: "both" }],
        })
      )
    ).toEqual({
      error:
        "Gmail event-triggered automations need mailbox subscriptions before they can run.",
    })
  })

  test("rejects unsupported provider events", () => {
    expect(
      createAutomationArgs(
        eventForm({
          name: "Watch support",
          instructions: "Read Slack and post to Slack.",
          eventProvider: "slack",
          event: "page.updated",
          eventCriteria: { channel: "C123" },
          surfaces: [{ provider: "slack", access: "both" }],
        })
      )
    ).toEqual({ error: "Choose a supported automation event." })
  })
})

function githubReviewForm() {
  return eventForm({
    name: "Watch PR reviews",
    instructions: "Read GitHub and post to Slack.",
    eventProvider: "github",
    event: "pull_request.review_comment.changed",
    eventCriteria: {
      repo: "milo/app",
      pr: "42",
      path: "src/app.ts",
    },
    surfaces: [
      { provider: "github", access: "read" },
      { provider: "slack", access: "write" },
    ],
  })
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
