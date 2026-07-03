import { beforeEach, expect, test, vi } from "vitest"
import { type ModelRuntime } from "../model/types"
import { type ToolRuntime } from "../tool"
import { type ConvexId, type RunHandoffs, type RuntimeTool } from "../types"
import { runAgentLoop } from "./loop"
import { type QueuedModelResponse, queuedModelResponses } from "./test-model"

const triggerWait = vi.hoisted(() => ({
  createToken: vi.fn(async () => ({ id: "waitpoint_1" })),
  forToken: vi.fn(),
}))

vi.mock("@trigger.dev/sdk/v3", () => ({
  wait: {
    createToken: triggerWait.createToken,
    forToken: triggerWait.forToken,
  },
}))

beforeEach(() => {
  triggerWait.createToken.mockClear()
  triggerWait.forToken.mockReset()
})

test("final visible actions think after one of several offers resolves", async () => {
  triggerWait.forToken
    .mockResolvedValueOnce({
      ok: true,
      output: {
        reason: "resolved",
        subject: { id: id<"integrationOffers">("offer_github"), kind: "offer" },
      },
    })
    .mockResolvedValueOnce({
      ok: true,
      output: { reason: "cancelled" },
    })

  const runtime = createRuntime({
    handoffs: offerHandoffSequence(),
    subjects: resolvedOfferSubjects(),
  })
  const model = createModel([
    reactionResponse("call_1", "fire"),
    reactionResponse("call_2", "eyes"),
  ])

  await expect(runAgentLoop({ attempt: 1, model, runtime })).resolves.toEqual({
    message: "",
    status: "stopped",
  })

  expect(model.complete).toHaveBeenCalledTimes(2)
  expect(model.complete.mock.calls[1]?.[0].messages).toContainEqual(
    expect.objectContaining({
      content: expect.stringContaining("cancelled"),
      role: "user",
    })
  )
  expect(runtime.convex.markOfferConsumed).toHaveBeenCalledWith({
    integrationOfferId: "offer_github",
  })
  expect(runtime.convex.createWaiter).toHaveBeenLastCalledWith({
    expiresAt: 2000,
    runId: "run_1",
    waitpointId: "waitpoint_1",
  })
})

function offerHandoffSequence(): RunHandoffs[] {
  return [
    emptyHandoffs(),
    { approvals: [], offers: [githubOffer("pending"), driveOffer()] },
    { approvals: [], offers: [driveOffer()] },
    { approvals: [], offers: [driveOffer()] },
    { approvals: [], offers: [driveOffer()] },
    emptyHandoffs(),
  ]
}

function resolvedOfferSubjects(): RunHandoffs {
  return {
    approvals: [],
    offers: [githubOffer("cancelled"), driveOffer()],
  }
}

function reactionResponse(
  callId: string,
  reaction: string
): QueuedModelResponse {
  return {
    content: null,
    toolCalls: [
      {
        args: {
          final: true,
          reaction,
          target: { messageTs: "123.456" },
        },
        id: callId,
        name: "add_reaction",
      },
    ],
    type: "tool_calls",
  }
}

function createModel(responses: QueuedModelResponse[]) {
  const queue = queuedModelResponses(responses)

  return {
    complete: vi.fn<ModelRuntime["complete"]>(async () => {
      const response = queue.shift()

      if (response === undefined) {
        throw new Error("No model response queued.")
      }

      return response
    }),
  } satisfies ModelRuntime
}

function createRuntime(options: {
  handoffs: RunHandoffs[]
  subjects: RunHandoffs
}): ToolRuntime {
  const loadRunHandoffs = vi.fn(async () => {
    return options.handoffs.shift() ?? emptyHandoffs()
  })

  return {
    convex: {
      addReaction: vi.fn(async () => ({ status: "added" })),
      createWaiter: vi.fn(async () => id<"waiters">("waiter_1")),
      expireWaiter: vi.fn(),
      loadRunHandoffSubjects: vi.fn(async () => options.subjects),
      loadRunHandoffs,
      markOfferConsumed: vi.fn(),
      recordEvent: vi.fn(),
    },
    context: {
      activeSurface: {
        communicated: false,
        surface: "slack",
        target: null,
      },
      prompt: {
        context: "context",
        instructions: "system",
        organization: null,
      },
      run: {
        id: id<"runs">("run_1"),
        rootId: null,
        sandboxId: null,
        status: "running",
        tenantId: "tenant",
      },
      session: null,
      tools: [addReactionTool()],
    },
    sandbox: {},
  } as unknown as ToolRuntime
}

function emptyHandoffs(): RunHandoffs {
  return { approvals: [], offers: [] }
}

function githubOffer(status: "cancelled" | "pending") {
  return offerHandoff("offer_github", "github", status, 1000)
}

function driveOffer() {
  return offerHandoff("offer_drive", "googleDrive", "pending", 2000)
}

function offerHandoff(
  offerId: string,
  integration: string,
  status: "cancelled" | "pending",
  expiresAt: number
) {
  return {
    id: id<"integrationOffers">(offerId),
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

function id<TableName extends string>(value: string) {
  return value as ConvexId<TableName>
}
