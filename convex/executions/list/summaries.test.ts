import { expect, test } from "vitest"
import { type QueryCtx } from "../../_generated/server"
import { summarizeExecution } from "./summaries"

test("uses event automation run snapshots when the automation document is unavailable", async () => {
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

test("uses message run snapshots when the message document is unavailable", async () => {
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

test("does not use automation names as instructions", async () => {
  const summary = await summarizeExecution(
    fakeQueryCtx({
      event: {
        _id: "event",
        _creationTime: 0,
        tenantId: "tenant",
        integrationId: "integration",
        key: "slack:event",
        type: "message.created",
        createdAt: 0,
      },
      integration: slackIntegration(),
      run: {
        _id: "run",
        _creationTime: 0,
        tenantId: "tenant",
        automationId: "missing-automation",
        reason: { type: "event", eventId: "event" },
        data: { automationName: "Notion test" },
        createdAt: 0,
      },
    }),
    execution()
  )

  expect(summary.title).toBe("Notion test")
  expect(summary.instructions).toBeUndefined()
})

test("uses event text instead of manual copy for orphaned event runs", async () => {
  const summary = await summarizeExecution(
    fakeQueryCtx({
      event: {
        _id: "event",
        _creationTime: 0,
        tenantId: "tenant",
        integrationId: "integration",
        key: "slack:event",
        type: "message.created",
        text: "can you schedule a launch review?",
        createdAt: 0,
      },
      integration: slackIntegration(),
      run: {
        _id: "run",
        _creationTime: 0,
        tenantId: "tenant",
        reason: { type: "event", eventId: "event" },
        createdAt: 0,
      },
    }),
    execution()
  )

  expect(summary.title).toBe("can you schedule a launch review?")
  expect(summary.instructions).toBeUndefined()
  expect(summary.sourceParts).toEqual([
    "Triggered by event:",
    "Slack",
    "event:",
    "New channel message",
  ])
})

test("uses message text as legacy message run instructions", async () => {
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
