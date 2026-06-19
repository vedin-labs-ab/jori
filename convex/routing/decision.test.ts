import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { type Id } from "../_generated/dataModel"
import { sendOpenRouterChat } from "../model"
import { type MessageRoutingContext } from "./context"
import { decideRoute } from "./decision"

vi.mock("../model", () => ({
  sendOpenRouterChat: vi.fn(),
}))

const originalIntakeModel = process.env.OPENROUTER_INTAKE_MODEL

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  restoreIntakeModel(originalIntakeModel)
})

describe("message intake routing request", () => {
  test("uses GLM 5.2 with latency-prioritized provider routing", async () => {
    process.env.OPENROUTER_INTAKE_MODEL = ""
    vi.mocked(sendOpenRouterChat).mockResolvedValueOnce(
      modelResponse({ route: "agent" })
    )

    await decideRoute(context({ isAddressed: true }))

    expect(lastRoutingRequest()).toMatchObject({
      maxTokens: 128,
      model: "z-ai/glm-5.2",
      provider: {
        requireParameters: true,
        sort: "latency",
      },
    })
  })

  test("sends route-specific structured output schema", async () => {
    vi.mocked(sendOpenRouterChat).mockResolvedValueOnce(
      modelResponse({ route: "agent" })
    )

    await decideRoute(context({ isAddressed: true }))

    expect(lastRoutingSchema()).toMatchObject({
      oneOf: [
        {
          additionalProperties: false,
          required: ["route"],
          properties: {
            route: { enum: ["ignore"] },
          },
        },
        {
          additionalProperties: false,
          required: ["route", "reply"],
          properties: {
            route: { enum: ["reply"] },
            reply: { minLength: 1 },
          },
        },
        {
          additionalProperties: false,
          required: ["route"],
          properties: {
            route: { enum: ["agent"] },
            reply: { minLength: 1 },
          },
        },
      ],
    })
  })
})

describe("message intake quick replies", () => {
  test("replies to addressed greetings without OpenRouter", async () => {
    await expect(
      decideRoute(context({ isAddressed: true, text: "@Milo hello my man" }))
    ).resolves.toEqual({
      reply: "Hey, what can I help with?",
      route: "reply",
    })

    expect(sendOpenRouterChat).not.toHaveBeenCalled()
  })

  test("keeps greetings with work on the model path", async () => {
    vi.mocked(sendOpenRouterChat).mockResolvedValueOnce(
      modelResponse({ route: "agent" })
    )

    await expect(
      decideRoute(context({ isAddressed: true, text: "@Milo hello check CI" }))
    ).resolves.toEqual({
      model: "test-model",
      route: "agent",
    })
  })
})

describe("message intake routing decisions", () => {
  test("does not silently ignore mentioned small talk", async () => {
    vi.mocked(sendOpenRouterChat).mockResolvedValueOnce(
      modelResponse({ route: "ignore" })
    )

    await expect(decideRoute(context({ isAddressed: true }))).resolves.toEqual({
      model: "test-model",
      reply: "What can I help with?",
      route: "reply",
    })
  })

  test("recovers when a reply route omits reply text", async () => {
    vi.mocked(sendOpenRouterChat).mockResolvedValueOnce(
      modelResponse({ route: "reply" })
    )

    await expect(decideRoute(context({ isAddressed: true }))).resolves.toEqual({
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

function restoreIntakeModel(value: string | undefined) {
  if (value === undefined) {
    delete process.env.OPENROUTER_INTAKE_MODEL
    return
  }

  process.env.OPENROUTER_INTAKE_MODEL = value
}

function lastRoutingRequest() {
  const [request] = vi.mocked(sendOpenRouterChat).mock.calls.at(-1) ?? []

  if (request === undefined) {
    throw new Error("Expected message intake to call OpenRouter.")
  }

  return request
}

function lastRoutingSchema() {
  const responseFormat = lastRoutingRequest().responseFormat as
    | { jsonSchema?: { schema?: unknown } }
    | undefined

  return responseFormat?.jsonSchema?.schema
}

type ContextOverrides = Partial<MessageRoutingContext> & { text?: string }

function context(overrides: ContextOverrides = {}): MessageRoutingContext {
  const currentMessage = {
    actor: "<@U123>",
    createdAt: 1,
    id: "message" as Id<"messages">,
    observedAt: 1,
    text: overrides.text ?? "@Milo please check this",
    type: "message.channels",
  }
  const { text: _text, ...contextOverrides } = overrides

  return {
    activeExecution: null,
    currentMessage,
    integration: "slack",
    isAddressed: false,
    isDirect: false,
    recentMessages: [currentMessage],
    ...contextOverrides,
  }
}

function modelResponse(content: {
  reply?: string
  route: "agent" | "ignore" | "reply"
}) {
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
