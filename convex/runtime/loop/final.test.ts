import { expect, test } from "vitest"
import { createPlatform } from "../../../test/platform"
import {
  createQueuedModel,
  createRuntime,
  type QueuedModelResponse,
  runLoop,
  runtimeContext,
  runtimeId,
} from "../../../test/runtime"
import { type RunHandoffs } from "../../runs/execution/waiters/handoffs"
import { type RuntimeTool } from "../platform/types"

test("final visible actions think after one of several offers resolves", async () => {
  const platform = createPlatform({ handoffs: offerHandoffSequence() })
  const runtime = createRuntime({
    context: runtimeContext({
      activeSurface: { communicated: false, surface: "slack", target: null },
      tools: [addReactionTool()],
    }),
    platform,
  })
  const model = createQueuedModel([
    reactionResponse("call_1", "fire"),
    reactionResponse("call_2", "eyes"),
  ])

  await expect(
    runLoop({
      model,
      runtime,
      wakes: [
        {
          reason: "resolved",
          subject: {
            id: runtimeId<"integrationOffers">("offer_github"),
            kind: "offer",
          },
          waiter: runtimeId<"waiters">("waiter_1"),
        },
        { reason: "cancelled", waiter: runtimeId<"waiters">("waiter_2") },
      ],
    })
  ).resolves.toBe("stopped")

  expect(model.complete).toHaveBeenCalledTimes(2)
  expect(model.complete.mock.calls[1]?.[0].messages).toContainEqual(
    expect.objectContaining({
      content: expect.stringContaining("cancelled"),
      role: "user",
    })
  )
  expect(runtime.platform.markOfferConsumed).toHaveBeenCalledWith({
    integrationOfferId: "offer_github",
  })
  expect(runtime.platform.park).toHaveBeenLastCalledWith({ expiresAt: 2000 })
})

// One snapshot per handoff read: the two offers stay open across the first
// park, GitHub is cancelled by the time the run wakes, and Notion is what the
// run parks on next.
function offerHandoffSequence(): RunHandoffs[] {
  return [
    { approvals: [], offers: [githubOffer("pending"), notionOffer()] },
    { approvals: [], offers: [githubOffer("pending"), notionOffer()] },
    { approvals: [], offers: [githubOffer("cancelled"), notionOffer()] },
    { approvals: [], offers: [notionOffer()] },
    { approvals: [], offers: [] },
  ]
}

function reactionResponse(
  callId: string,
  reaction: string
): QueuedModelResponse {
  return {
    content: null,
    toolCalls: [
      {
        args: { final: true, reaction, target: { messageTs: "123.456" } },
        id: callId,
        name: "add_reaction",
      },
    ],
    type: "tool_calls",
  }
}

function githubOffer(status: "cancelled" | "pending") {
  return offerHandoff("offer_github", "github", status, 1000)
}

function notionOffer() {
  return offerHandoff("offer_notion", "notion", "pending", 2000)
}

function offerHandoff(
  offerId: string,
  integration: RunHandoffs["offers"][number]["integration"],
  status: "cancelled" | "pending",
  expiresAt: number
): RunHandoffs["offers"][number] {
  return {
    id: runtimeId<"integrationOffers">(offerId),
    integration,
    status,
    summary: null,
    expiresAt,
  }
}

function addReactionTool(): RuntimeTool {
  return {
    access: "write",
    description: "Add reaction.",
    inputSchema: {},
    name: "add_reaction",
    route: "surface",
  }
}
