import { expect, test } from "vitest"
import { type Id } from "../_generated/dataModel"
import { type MessageRoutingContext } from "./context"
import { type RoutingConversationEntry } from "./history"
import { createRoutingPayload } from "./payload"

test("groups the message, addressing, run, and history context", () => {
  const previous = previousEntry()
  const current = currentEntry()
  const payload = createRoutingPayload(
    context({
      activeRun: {
        latestStatus: "tool.waiting",
        runId: "run" as Id<"runs">,
        status: "running",
      },
      currentMessage: current,
      isAddressed: true,
      isMentioned: true,
      recentMessages: [previous, current],
    })
  )

  expect(payload).toEqual({
    surface: "slack",
    run: expectedRun(),
    message: expectedCurrentMessage(),
    addressing: expectedAddressing(),
    context: { history: [expectedPreviousMessage()] },
  })
})

function previousEntry() {
  return entry({
    actor: "Milo",
    createdAt: 1,
    id: "previous",
    source: "self",
    text: "I can help with Slack and GitHub.",
  })
}

function currentEntry() {
  return entry({
    actor: "Albin Vedin",
    createdAt: 2,
    id: "current",
    observedAt: 3,
    source: "user",
    text: "@Milo what tools do u have?",
  })
}

function expectedRun() {
  return {
    id: "run",
    status: "running",
    latestStatus: "tool.waiting",
  }
}

function expectedCurrentMessage() {
  return {
    id: "current",
    text: "@Milo what tools do u have?",
    createdAt: 2,
    observedAt: 3,
    author: {
      kind: "user",
      name: "Albin Vedin",
    },
  }
}

function expectedAddressing() {
  return {
    isDirect: false,
    isMentioned: true,
  }
}

function expectedPreviousMessage() {
  return {
    id: "previous",
    text: "I can help with Slack and GitHub.",
    createdAt: 1,
    observedAt: null,
    author: {
      kind: "self",
      name: "Milo",
    },
  }
}

function context(
  overrides: Partial<MessageRoutingContext> = {}
): MessageRoutingContext {
  const currentMessage = entry({
    actor: "Albin Vedin",
    id: "current",
    text: "@Milo what tools do u have?",
  })

  return {
    activeRun: null,
    capabilitySummary: "",
    currentMessage,
    integration: "slack",
    isAddressed: false,
    isDirect: false,
    isMentioned: false,
    recentMessages: [currentMessage],
    ...overrides,
  }
}

function entry(
  overrides: Partial<RoutingConversationEntry>
): RoutingConversationEntry {
  return {
    actor: null,
    createdAt: 1,
    id: "message",
    observedAt: null,
    source: "user",
    text: "",
    type: "message.channels",
    ...overrides,
  }
}
