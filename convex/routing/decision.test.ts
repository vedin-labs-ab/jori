import { beforeEach, describe, expect, test, vi } from "vitest"
import { type Id } from "../_generated/dataModel"
import { sendOpenRouterChat } from "../model"
import { decideRoute, type SlackRoutingContext } from "./decision"

vi.mock("../model", () => ({
  sendOpenRouterChat: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe("Slack intake routing", () => {
  test("does not silently ignore mentioned small talk", async () => {
    vi.mocked(sendOpenRouterChat).mockResolvedValueOnce(
      modelResponse({ route: "ignore" })
    )

    await expect(decideRoute(context({ isMention: true }))).resolves.toEqual({
      model: "test-model",
      reply: "What can I help with?",
      route: "reply",
    })
  })

  test("routes model-ignored active work back to the agent", async () => {
    vi.mocked(sendOpenRouterChat).mockResolvedValueOnce(
      modelResponse({ route: "ignore" })
    )

    await expect(
      decideRoute(
        context({
          activeExecution: {
            executionId: "execution" as Id<"executions">,
            latestStatus: "tool.waiting",
            runId: "run" as Id<"runs">,
            status: "running",
          },
        })
      )
    ).resolves.toEqual({
      model: "test-model",
      route: "agent",
    })
  })

  test("keeps unaddressed channel chatter ignored", async () => {
    vi.mocked(sendOpenRouterChat).mockResolvedValueOnce(
      modelResponse({ route: "ignore" })
    )

    await expect(decideRoute(context())).resolves.toEqual({
      model: "test-model",
      route: "ignore",
    })
  })
})

function context(
  overrides: Partial<SlackRoutingContext> = {}
): SlackRoutingContext {
  const currentMessage = {
    actor: "<@U123>",
    createdAt: 1,
    id: "message" as Id<"messages">,
    observedAt: 1,
    text: "<@MILO> hello my man",
    type: "message.channels",
  }

  return {
    activeExecution: null,
    currentMessage,
    isDirectMessage: false,
    isMention: false,
    recentMessages: [currentMessage],
    ...overrides,
  }
}

function modelResponse(content: { route: "agent" | "ignore" | "reply" }) {
  return {
    choices: [
      {
        finishReason: "stop",
        message: {
          content: JSON.stringify(content),
        },
      },
    ],
    model: "test-model",
  } as Awaited<ReturnType<typeof sendOpenRouterChat>>
}
