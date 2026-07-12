import { expect, test } from "vitest"
import {
  emptyQueryResult,
  messageDisplay,
} from "../../../../test/convex/console"
import { type QueryCtx } from "../../../_generated/server"
import { summarizeRun } from "../summaries"

test("includes the latest integration offer for the run", async () => {
  const run = testRun("Create a Notion page.")
  const summary = await summarizeRun(
    fakeQueryCtx({
      integrationOffer: integrationOffer({
        _id: "offer",
        summary: "Connect Notion so Milo can create the requested page.",
      }),
      run,
    }),
    run
  )

  expect(summary.offer).toEqual({
    delivery: undefined,
    expiresAt: expect.any(Number),
    id: "offer",
    integration: "notion",
    integrationLabel: "Notion",
    result: undefined,
    state: "pending",
    summary: "Connect Notion so Milo can create the requested page.",
    updatedAt: 10,
  })
  expect(summary.offers).toHaveLength(1)
  expect(summary.searchableText).toContain("connect notion")
})

test("uses the newest integration offer for the run", async () => {
  const run = testRun("Connect a workspace.")
  const summary = await summarizeRun(
    fakeQueryCtx({
      integrationOffers: [
        integrationOffer({ _id: "old-offer", createdAt: 10 }),
        integrationOffer({ _id: "new-offer", createdAt: 20 }),
      ],
      run,
    }),
    run
  )

  expect(summary.offer?.id).toBe("new-offer")
  expect(summary.offers.map((offer) => offer.id)).toEqual([
    "new-offer",
    "old-offer",
  ])
})

function testRun(title: string) {
  return {
    _id: "run",
    _creationTime: 0,
    tenantId: "tenant",
    status: "completed",
    createdAt: 0,
    endedAt: 1000,
    cause: { type: "message", messageId: "message", kind: "mention" },
    snapshot: {
      title,
      ...messageDisplay({ kind: "mention" }),
    },
  } as Parameters<typeof summarizeRun>[1]
}

function fakeQueryCtx(docs: Record<string, unknown>) {
  return {
    db: {
      get: async (id: string) => docs[id] ?? null,
      query: (table: string) => ({
        withIndex: () =>
          table === "integrationOffers"
            ? fakeIntegrationOffers(docs)
            : emptyQueryResult(),
      }),
    },
  } as unknown as QueryCtx
}

function fakeIntegrationOffers(docs: Record<string, unknown>) {
  const offers =
    docs.integrationOffers ??
    (docs.integrationOffer === undefined ? [] : [docs.integrationOffer])

  return {
    async *[Symbol.asyncIterator]() {
      yield* offers as Record<string, unknown>[]
    },
    first: async () => null,
    order: () => emptyQueryResult(),
    take: async () => [],
  }
}

function integrationOffer(overrides: Record<string, unknown>) {
  return {
    _creationTime: 0,
    _id: "offer",
    tenantId: "tenant",
    integration: "notion",
    tokenHash: "hash",
    status: "pending",
    summary: "Connect Notion.",
    source: { surface: "slack", runId: "run" },
    runId: "run",
    expiresAt: Date.now() + 1000,
    createdAt: 10,
    updatedAt: 10,
    ...overrides,
  }
}
