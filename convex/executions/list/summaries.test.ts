import { expect, test } from "vitest"
import { type QueryCtx } from "../../_generated/server"
import { summarizeExecution } from "./summaries"

test("uses stored automation snapshots when the automation document is unavailable", async () => {
  const summary = await summarizeExecution(
    fakeQueryCtx({
      event: {
        _id: "event",
        _creationTime: 0,
        tenantId: "tenant",
        integrationId: "integration",
        key: "slack:event",
        type: "message.created",
        actor: { email: "vedin.labs@gmail.com" },
        text: "perform a deep analysis",
        createdAt: 0,
      },
      integration: slackIntegration(),
      run: {
        _id: "run",
        _creationTime: 0,
        tenantId: "tenant",
        automationId: "missing-automation",
        reason: { type: "event", eventId: "event" },
        title: "Deep analysis",
        instructions: "Perform the deep analysis.",
        createdAt: 0,
      },
    }),
    execution()
  )

  expect(summary.title).toBe("Deep analysis")
  expect(summary.instructions).toBe("Perform the deep analysis.")
  expect(summary.searchableText).toContain("perform the deep analysis")
  expect("promptUrl" in summary).toBe(false)
  expect(summary.sourceParts).toEqual([
    "Triggered by event:",
    "vedin.labs@gmail.com",
    "in",
    "Slack",
    "event:",
    "New channel message",
    "for automation:",
    "Deep analysis",
  ])
})

test("uses stored message snapshots when the message document is unavailable", async () => {
  const summary = await summarizeExecution(
    fakeQueryCtx({
      run: {
        _id: "run",
        _creationTime: 0,
        tenantId: "tenant",
        reason: { type: "message", messageId: "missing-message" },
        title: "Please summarize this thread.",
        instructions: "Please summarize this thread.\n\nKeep it concise.",
        createdAt: 0,
      },
    }),
    execution()
  )

  expect(summary.title).toBe("Please summarize this thread.")
  expect(summary.instructions).toBe(
    "Please summarize this thread.\n\nKeep it concise."
  )
  expect(summary.searchableText).toContain("keep it concise")
})

test("keeps stored automation snapshots when the automation changes", async () => {
  const summary = await summarizeExecution(
    fakeQueryCtx({
      automation: {
        _id: "automation",
        _creationTime: 0,
        tenantId: "tenant",
        name: "Updated automation name",
        instructions: "Updated automation instructions.",
        trigger: { type: "time" },
        access: { integrations: [] },
        createdBy: "user",
        createdAt: 0,
        updatedAt: 0,
      },
      run: {
        _id: "run",
        _creationTime: 0,
        tenantId: "tenant",
        automationId: "automation",
        reason: { type: "time", scheduledAt: 0 },
        title: "Original automation name",
        instructions: "Original automation instructions.",
        createdAt: 0,
      },
    }),
    execution()
  )

  expect(summary.title).toBe("Original automation name")
  expect(summary.instructions).toBe("Original automation instructions.")
  expect(summary.sourceParts).toEqual([
    "Triggered by automation:",
    "Original automation name",
  ])
})

test("does not read message text as an instructions fallback", async () => {
  const summary = await summarizeExecution(
    fakeQueryCtx({
      integration: slackIntegration(),
      message: {
        _id: "message",
        _creationTime: 0,
        tenantId: "tenant",
        integrationId: "integration",
        type: "message.channels",
        externalId: "slack:message",
        text: "Please summarize this thread.\n\nKeep it concise.",
        createdAt: 0,
      },
      run: {
        _id: "run",
        _creationTime: 0,
        tenantId: "tenant",
        reason: { type: "message", messageId: "message" },
        title: "Stored message title",
        createdAt: 0,
      },
    }),
    execution()
  )

  expect(summary.title).toBe("Stored message title")
  expect(summary.instructions).toBeUndefined()
  expect(summary.searchableText).not.toContain("keep it concise")
})

function slackIntegration() {
  return {
    _id: "integration",
    _creationTime: 0,
    tenantId: "tenant",
    provider: "slack",
    scope: "tenant",
    externalId: "slack-team",
    credentials: {},
    status: "active",
    createdBy: "user",
    createdAt: 0,
    updatedAt: 0,
  }
}

function execution() {
  return {
    _id: "execution",
    _creationTime: 0,
    tenantId: "tenant",
    runId: "run",
    promptId: "prompt",
    status: "completed",
    createdAt: 0,
    finishedAt: 1000,
  } as Parameters<typeof summarizeExecution>[1]
}

function fakeQueryCtx(docs: Record<string, unknown>) {
  return {
    db: {
      get: async (id: string) => docs[id] ?? null,
      query: () => ({
        withIndex: () => ({
          first: async () => null,
          order: () => ({
            first: async () => null,
          }),
        }),
      }),
    },
  } as unknown as QueryCtx
}
