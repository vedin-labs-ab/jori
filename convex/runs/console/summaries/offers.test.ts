import { expect, test } from "vitest"
import {
  fakeQueryCtx,
  messageDisplay,
  testRun,
} from "../../../../test/convex/console"
import { summarizeRun } from "../summaries"

test("summarizes offers newest first and includes them in run search", async () => {
  const run = testRun({
    cause: { type: "message", messageId: "message", kind: "mention" },
    snapshot: {
      title: "Create a Notion page.",
      ...messageDisplay({ kind: "mention" }),
    },
  })
  const summary = await summarizeRun(
    fakeQueryCtx(
      { run },
      {
        integrationOffers: [
          integrationOffer({ _id: "old-offer", createdAt: 10 }),
          integrationOffer({
            _id: "new-offer",
            createdAt: 20,
            summary: "Connect Notion so Jori can create the requested page.",
          }),
        ],
      }
    ),
    run
  )

  expect(summary.offer).toEqual({
    delivery: undefined,
    expiresAt: Number.MAX_SAFE_INTEGER,
    id: "new-offer",
    integration: "notion",
    integrationLabel: "Notion",
    result: undefined,
    state: "pending",
    summary: "Connect Notion so Jori can create the requested page.",
    updatedAt: 10,
  })
  expect(summary.offers.map((offer) => offer.id)).toEqual([
    "new-offer",
    "old-offer",
  ])
  expect(summary.searchableText).toContain(
    "connect notion so jori can create the requested page."
  )
})

function integrationOffer(overrides: Record<string, unknown>) {
  return {
    _creationTime: 0,
    _id: "offer",
    organizationId: "organization",
    integration: "notion",
    tokenHash: "hash",
    status: "pending",
    summary: "Connect Notion.",
    source: { surface: "slack", runId: "run" },
    runId: "run",
    expiresAt: Number.MAX_SAFE_INTEGER,
    createdAt: 10,
    updatedAt: 10,
    ...overrides,
  }
}
