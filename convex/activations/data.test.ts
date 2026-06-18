import { expect, test } from "vitest"
import { type DataModel, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { startMessageRun } from "./data"

test("marks new conversation message runs as mentions", async () => {
  const ctx = fakeMutationCtx()
  const result = await startMessageRun(ctx, {
    activation: null,
    integration: integration(),
    message: message("Please help."),
    conversationId: "conversation",
    createdBy: "user",
    now: 1000,
  })

  expect(ctx.inserts).toContainEqual({
    table: "runs",
    doc: expect.objectContaining({
      reason: { type: "message", messageId: "message", kind: "mention" },
    }),
  })
  expect(ctx.inserts.map((insert) => insert.table)).toEqual([
    "runs",
    "activations",
  ])
  expect(result.activationId).toBe("activations-2")
})

test("marks activated conversation message runs as replies", async () => {
  const ctx = fakeMutationCtx()
  const result = await startMessageRun(ctx, {
    activation: {
      _id: id<"activations">("activation"),
      _creationTime: 0,
      tenantId: "tenant",
      runId: id<"runs">("first-run"),
      integrationId: id<"integrations">("integration"),
      conversationId: "conversation",
      createdAt: 0,
    },
    integration: integration(),
    message: message("Following up."),
    conversationId: "conversation",
    createdBy: "user",
    now: 1000,
  })

  expect(ctx.inserts).toEqual([
    {
      table: "runs",
      doc: expect.objectContaining({
        reason: { type: "message", messageId: "message", kind: "reply" },
      }),
    },
  ])
  expect(result.activationId).toBe("activation")
})

test("creates Slack runtime status for Slack message runs", async () => {
  const ctx = fakeMutationCtx()
  await startMessageRun(ctx, {
    activation: null,
    integration: integration(),
    message: message("Please help.", {
      channelId: "C123",
      threadTs: "1710000000.000100",
      ts: "1710000000.000100",
    }),
    conversationId: "conversation",
    createdBy: "user",
    now: 1000,
  })

  expect(ctx.inserts).toEqual([
    {
      table: "runs",
      doc: expect.objectContaining({
        reason: { type: "message", messageId: "message", kind: "mention" },
      }),
    },
    {
      table: "runtimeSlackStatuses",
      doc: {
        tenantId: "tenant",
        runId: "runs-1",
        integrationId: "integration",
        channelId: "C123",
        threadTs: "1710000000.000100",
        state: "working",
        createdAt: 1000,
        updatedAt: 1000,
      },
    },
    {
      table: "activations",
      doc: expect.objectContaining({
        runId: "runs-1",
        conversationId: "conversation",
      }),
    },
  ])
  expect(ctx.scheduled).toEqual([{ delay: 0, args: { runId: "runs-1" } }])
})

function integration() {
  return {
    _id: id<"integrations">("integration"),
    _creationTime: 0,
    tenantId: "tenant",
    integration: "slack",
    scope: "tenant",
    externalId: "team",
    credentials: {},
    status: "active",
    createdBy: "user",
    createdAt: 0,
    updatedAt: 0,
  } as Parameters<typeof startMessageRun>[1]["integration"]
}

function message(text: string, data?: unknown) {
  return {
    _id: id<"messages">("message"),
    _creationTime: 0,
    tenantId: "tenant",
    integrationId: id<"integrations">("integration"),
    integration: "slack",
    type: "message.channels",
    externalId: "slack:message",
    text,
    data,
    metadata: [],
    createdAt: 0,
  } as Parameters<typeof startMessageRun>[1]["message"]
}

function id<TableName extends keyof DataModel>(value: string) {
  return value as Id<TableName>
}

function fakeMutationCtx() {
  const inserts: Array<{ table: string; doc: unknown }> = []
  const scheduled: Array<{ args: unknown; delay: number }> = []

  return {
    inserts,
    scheduled,
    db: {
      insert: async (table: string, doc: unknown) => {
        inserts.push({ table, doc })

        return `${table}-${inserts.length}`
      },
      query: () => ({
        withIndex: () => ({
          first: async () => null,
        }),
      }),
    },
    scheduler: {
      runAfter: async (delay: number, _reference: unknown, args: unknown) => {
        scheduled.push({ args, delay })

        return "scheduled"
      },
    },
  } as unknown as MutationCtx & {
    inserts: Array<{ table: string; doc: unknown }>
    scheduled: Array<{ args: unknown; delay: number }>
  }
}
