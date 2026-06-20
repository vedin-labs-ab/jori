import { expect, test } from "vitest"
import { type DataModel, type Id } from "../_generated/dataModel"
import { type MutationCtx } from "../_generated/server"
import { queueReply } from "./replies/queue"

test("queues reply delivery as an idempotent outbox operation", async () => {
  const ctx = fakeMutationCtx()

  const outboxId = await queueReply(ctx, {
    kind: "quick",
    messageId: id<"messages">("message"),
    routingId: id<"routing">("routing"),
    tenantId: "tenant",
    text: "On it.",
  })

  expect(outboxId).toBe("outbox-1")
  expect(ctx.inserts).toEqual([
    {
      table: "outbox",
      doc: expect.objectContaining({
        idempotencyKey: "reply:routing:quick",
        operation: {
          type: "reply.send",
          kind: "quick",
          messageId: "message",
          routingId: "routing",
          text: "On it.",
        },
        state: "pending",
        tenantId: "tenant",
      }),
    },
  ])
  expect(ctx.scheduled).toEqual([{ args: {}, delay: 0 }])
})

function id<TableName extends keyof DataModel>(value: string) {
  return value as Id<TableName>
}

type FakeCtx = MutationCtx & {
  inserts: Array<{ table: string; doc: unknown }>
  scheduled: Array<{ args: unknown; delay: number }>
}

function fakeMutationCtx(): FakeCtx {
  const inserts: Array<{ table: string; doc: unknown }> = []
  const scheduled: Array<{ args: unknown; delay: number }> = []

  return {
    inserts,
    scheduled,
    db: {
      insert: async (table: string, doc: Record<string, unknown>) => {
        const rowId = `${table}-${inserts.length + 1}`

        inserts.push({ table, doc })

        return rowId
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
  } as unknown as FakeCtx
}
