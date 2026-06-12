// @vitest-environment jsdom
import { describe, expect, test } from "vitest"
import { createAutomationArgs } from "./payload"
import { emptyAutomationForm } from "./types"

describe("automation event payload resources", () => {
  test("creates event automation args with a required resource", () => {
    expect(
      createAutomationArgs({
        ...emptyAutomationForm,
        name: "Watch support",
        instructions: "Read Slack and post to Slack.",
        type: "event",
        eventProvider: "slack",
        event: "message.created",
        eventResource: "C123",
        surfaces: [{ provider: "slack", access: "both" }],
      })
    ).toMatchObject({
      args: {
        trigger: {
          type: "event",
          provider: "slack",
          event: "message.created",
          filter: "C123",
        },
      },
    })
  })

  test("requires event resources declared by the catalog", () => {
    expect(
      createAutomationArgs({
        ...emptyAutomationForm,
        name: "Watch support",
        instructions: "Read Slack and post to Slack.",
        type: "event",
        eventProvider: "slack",
        event: "message.created",
        eventResource: "",
        surfaces: [{ provider: "slack", access: "both" }],
      })
    ).toEqual({ error: "Channel is required." })
  })
})

describe("automation event payload names", () => {
  test("omits resource filters for resource-free events", () => {
    expect(
      createAutomationArgs({
        ...emptyAutomationForm,
        name: "Watch inbox",
        instructions: "Read Gmail and draft with Gmail.",
        type: "event",
        eventProvider: "gmail",
        event: "message.received",
        eventResource: "",
        surfaces: [{ provider: "gmail", access: "both" }],
      })
    ).toMatchObject({
      args: {
        trigger: {
          type: "event",
          provider: "gmail",
          event: "message.received",
        },
      },
    })
  })

  test("rejects unsupported provider events", () => {
    expect(
      createAutomationArgs({
        ...emptyAutomationForm,
        name: "Watch support",
        instructions: "Read Slack and post to Slack.",
        type: "event",
        eventProvider: "slack",
        event: "page.updated",
        eventResource: "C123",
        surfaces: [{ provider: "slack", access: "both" }],
      })
    ).toEqual({ error: "Choose a supported automation event." })
  })
})
