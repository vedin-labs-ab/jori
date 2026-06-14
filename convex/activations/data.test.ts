import { expect, test } from "vitest"
import { type DataModel, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { startMessageRun } from "./data"

test("marks new conversation message runs as mentions", async () => {
  const ctx = fakeMutationCtx()
  const result = await startMessageRun(ctx, {
    activation: null,
    integration: integration(),
    messageId: id<"messages">("message"),
    messageText: "Please help.",
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
    messageId: id<"messages">("message"),
    messageText: "Following up.",
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

function integration() {
  return {
    _id: id<"integrations">("integration"),
    _creationTime: 0,
    tenantId: "tenant",
    provider: "slack",
    scope: "tenant",
    externalId: "team",
    credentials: {},
    status: "active",
    createdBy: "user",
    createdAt: 0,
    updatedAt: 0,
  } as Parameters<typeof startMessageRun>[1]["integration"]
}

function id<TableName extends keyof DataModel>(value: string) {
  return value as Id<TableName>
}

function fakeMutationCtx() {
  const inserts: Array<{ table: string; doc: unknown }> = []

  return {
    inserts,
    db: {
      insert: async (table: string, doc: unknown) => {
        inserts.push({ table, doc })

        return `${table}-${inserts.length}`
      },
    },
  } as unknown as MutationCtx & {
    inserts: Array<{ table: string; doc: unknown }>
  }
}
