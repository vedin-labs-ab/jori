import { beforeEach, expect, test, vi } from "vitest"
import { type Doc, type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { wakeRun } from "../../runs/execution/waiters/data"
import { recordTransition } from "../../transitions"
import {
  markIntegrationOfferCancelled,
  markIntegrationOfferConnected,
  markIntegrationOfferExpired,
  markIntegrationOfferFailed,
  type TerminalIntegrationOfferStatus,
  terminalIntegrationOfferStatus,
} from "./transition"

vi.mock("../../runs/execution/waiters/data", () => ({ wakeRun: vi.fn() }))
vi.mock("../../transitions", () => ({ recordTransition: vi.fn() }))

const now = 100
const integrationId = "integration" as Id<"integrations">

type Settlement = {
  cancelExpiration: boolean
  expectedPatch: Record<string, unknown>
  settle: (ctx: MutationCtx, offer: Doc<"integrationOffers">) => Promise<void>
  status: TerminalIntegrationOfferStatus
}

const settlements: Settlement[] = [
  {
    cancelExpiration: true,
    expectedPatch: { result: { integrationId }, updatedAt: now },
    settle: async (ctx, offer) => {
      await markIntegrationOfferConnected(ctx, offer, { integrationId, now })
    },
    status: "connected",
  },
  {
    cancelExpiration: true,
    expectedPatch: { result: { reason: "stopped" }, updatedAt: now },
    settle: async (ctx, offer) => {
      await markIntegrationOfferCancelled(ctx, offer, {
        actor: undefined,
        now,
        reason: "stopped",
      })
    },
    status: "cancelled",
  },
  {
    cancelExpiration: true,
    expectedPatch: { result: { error: "failed" }, updatedAt: now },
    settle: async (ctx, offer) => {
      await markIntegrationOfferFailed(ctx, offer, { error: "failed", now })
    },
    status: "failed",
  },
  {
    cancelExpiration: false,
    expectedPatch: { updatedAt: now },
    settle: async (ctx, offer) => {
      await markIntegrationOfferExpired(ctx, offer, now)
    },
    status: "expired",
  },
]

beforeEach(() => {
  vi.clearAllMocks()
})

test.each(settlements)("settles $status offers once", async (settlement) => {
  const fixture = offerFixture("pending")

  await settlement.settle(fixture.ctx, fixture.offer)

  expect(fixture.cancel).toHaveBeenCalledTimes(
    settlement.cancelExpiration ? 1 : 0
  )
  expect(fixture.patch).toHaveBeenCalledWith(fixture.offer._id, {
    ...settlement.expectedPatch,
    functionId: undefined,
    status: settlement.status,
  })
  expect(recordTransition).toHaveBeenCalledWith(fixture.ctx, {
    tenantId: fixture.offer.tenantId,
    subject: { kind: "integrationOffer", id: fixture.offer._id },
    syncSurface: true,
    type: settlement.status,
  })
  expect(wakeRun).toHaveBeenCalledWith(fixture.ctx, {
    reason: "resolved",
    runId: fixture.offer.runId,
    subject: { kind: "offer", id: fixture.offer._id },
  })
})

test.each([
  "cancelled",
  "connected",
  "expired",
  "failed",
] as const)("leaves %s offers settled", async (status) => {
  const fixture = offerFixture(status)

  await markIntegrationOfferFailed(fixture.ctx, fixture.offer, {
    error: "ignored",
    now,
  })

  expect(fixture.patch).not.toHaveBeenCalled()
  expect(fixture.cancel).not.toHaveBeenCalled()
  expect(recordTransition).not.toHaveBeenCalled()
  expect(wakeRun).not.toHaveBeenCalled()
})

test("narrows terminal offer statuses", () => {
  expect(terminalIntegrationOfferStatus("pending")).toBeNull()
  expect(terminalIntegrationOfferStatus("claimed")).toBeNull()

  for (const status of [
    "cancelled",
    "connected",
    "expired",
    "failed",
  ] as const) {
    expect(terminalIntegrationOfferStatus(status)).toBe(status)
  }
})

function offerFixture(status: Doc<"integrationOffers">["status"]) {
  let stored = offer(status)
  const patch = vi.fn(
    async (_id: Id<"integrationOffers">, value: Record<string, unknown>) => {
      stored = { ...stored, ...value } as Doc<"integrationOffers">
    }
  )
  const cancel = vi.fn(async () => undefined)
  const ctx = {
    db: {
      get: async () => stored,
      patch,
    },
    scheduler: { cancel },
  } as unknown as MutationCtx

  return { cancel, ctx, offer: stored, patch }
}

function offer(
  status: Doc<"integrationOffers">["status"]
): Doc<"integrationOffers"> {
  return {
    _creationTime: 0,
    _id: "offer" as Id<"integrationOffers">,
    createdAt: 0,
    expiresAt: 1000,
    functionId: "expiration" as Id<"_scheduled_functions">,
    integration: "github",
    runId: "run" as Id<"runs">,
    source: { surface: "slack" },
    status,
    tenantId: "tenant",
    tokenHash: "token",
    updatedAt: 0,
  }
}
