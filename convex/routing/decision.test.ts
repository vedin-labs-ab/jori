import { beforeEach, describe, expect, test, vi } from "vitest"
import { type Id } from "../_generated/dataModel"
import { sendOpenRouterChat } from "../model"
import { skills } from "../prompts/generated"
import { type MessageRoutingContext } from "./context"
import { decideRoute } from "./decision"

vi.mock("../model", () => ({
  sendOpenRouterChat: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe("message intake routing request", () => {
  test("uses MiniMax M3 with latency-prioritized provider routing", async () => {
    vi.mocked(sendOpenRouterChat).mockResolvedValueOnce(
      modelResponse({ route: "agent" })
    )

    await decideRoute(context({ isAddressed: true }))

    expect(lastRoutingRequest()).toMatchObject({
      maxTokens: 256,
      model: "minimax/minimax-m3",
      provider: {
        requireParameters: true,
        sort: "latency",
      },
      reasoning: { effort: "low" },
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
          required: ["route", "message"],
          properties: {
            route: { enum: ["respond"] },
            message: { minLength: 1 },
          },
        },
        {
          additionalProperties: false,
          required: ["route"],
          properties: {
            route: { enum: ["agent"] },
            message: { minLength: 1 },
          },
        },
      ],
    })
  })

  test("sends first-match routing precedence", async () => {
    vi.mocked(sendOpenRouterChat).mockResolvedValueOnce(
      modelResponse({ message: "Hey.", route: "respond" })
    )

    await decideRoute(context({ isAddressed: true }))

    const prompt = lastSystemPrompt()
    expect(prompt).toContain("## Task")
    expect(prompt).toContain("Choose the first matching route:")
    expect(prompt).toContain("assistant-directed message")
    expect(prompt).toContain("execution-related")
    expect(prompt).toContain("still uncertain")
    expect(prompt.indexOf("assistant-directed message")).toBeLessThan(
      prompt.indexOf("still uncertain")
    )
  })
})

describe("message intake routing guidance", () => {
  test("adds Slack text guidance for quick replies", async () => {
    vi.mocked(sendOpenRouterChat).mockResolvedValueOnce(
      modelResponse({ message: "Hey.", route: "respond" })
    )

    await decideRoute(context({ isAddressed: true }))

    const prompt = lastSystemPrompt()
    expect(prompt).toContain("## Communication")
    expect(prompt).toContain("Format messages so they feel native")
    expect(prompt).toContain("Destination: `Slack`")
    expect(prompt).toContain("Guidance:")
    expect(prompt.indexOf("Format messages so they feel native")).toBeLessThan(
      prompt.indexOf("Destination: `Slack`")
    )
    expect(prompt).toContain(skills.slack.communication.parts.text)
    expect(prompt).not.toContain("## Slack")
    expect(prompt).not.toContain("### Text")
    expect(prompt).not.toContain("## Format")
    expect(prompt).not.toContain("Output contract:")
    expect(prompt).not.toContain(skills.slack.communication.parts.rich)
  })

  test("does not add Slack guidance for non-Slack routing", async () => {
    vi.mocked(sendOpenRouterChat).mockResolvedValueOnce(
      modelResponse({ route: "agent" })
    )

    await decideRoute(context({ integration: "github", isAddressed: true }))

    expect(lastSystemPrompt()).not.toContain("## Communication")
  })
})

describe("message intake routing decisions", () => {
  test("keeps addressed model ignores ignored", async () => {
    vi.mocked(sendOpenRouterChat).mockResolvedValueOnce(
      modelResponse({ route: "ignore" })
    )

    await expect(decideRoute(context({ isAddressed: true }))).resolves.toEqual({
      model: "test-model",
      route: "ignore",
    })
  })

  test("ignores malformed respond routes without message text", async () => {
    vi.mocked(sendOpenRouterChat).mockResolvedValueOnce(
      modelResponse({ route: "respond" })
    )

    await expect(decideRoute(context({ isAddressed: true }))).resolves.toEqual({
      model: "test-model",
      route: "ignore",
    })
  })

  test("keeps model-ignored active work ignored", async () => {
    vi.mocked(sendOpenRouterChat).mockResolvedValueOnce(
      modelResponse({ route: "ignore" })
    )

    await expect(
      decideRoute(
        context({
          activeRun: {
            latestStatus: "tool.waiting",
            runId: "run" as Id<"runs">,
            status: "running",
          },
        })
      )
    ).resolves.toEqual({
      model: "test-model",
      route: "ignore",
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

  test("accepts a JSON decision wrapped in stray prose", async () => {
    vi.mocked(sendOpenRouterChat).mockResolvedValueOnce(
      modelTextResponse(
        'This is a greeting.\n\n{"route":"respond","message":"Hey Albin."}'
      )
    )

    await expect(decideRoute(context({ isAddressed: true }))).resolves.toEqual({
      model: "test-model",
      reply: "Hey Albin.",
      route: "respond",
    })
  })
})

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

function lastSystemPrompt() {
  const [message] = lastRoutingRequest().messages

  if (message?.role === "system" && typeof message.content === "string") {
    return message.content
  }

  throw new Error("Expected message intake to send a system prompt.")
}

function context(
  overrides: Partial<MessageRoutingContext> = {}
): MessageRoutingContext {
  const currentMessage = {
    actor: "<@U123>",
    createdAt: 1,
    id: "message" as Id<"messages">,
    observedAt: 1,
    source: "user" as const,
    text: "@Milo please check this",
    type: "message.channels",
  }

  return {
    activeRun: null,
    capabilitySummary: null,
    currentMessage,
    integration: "slack",
    isAddressed: false,
    isDirect: false,
    recentMessages: [currentMessage],
    ...overrides,
  }
}

function modelResponse(content: {
  message?: string
  reply?: string
  route: "agent" | "ignore" | "respond"
}) {
  return modelTextResponse(JSON.stringify(content))
}

function modelTextResponse(content: string) {
  return {
    choices: [
      {
        finishReason: "stop",
        message: {
          content,
        },
      },
    ],
    model: "test-model",
  } as Awaited<ReturnType<typeof sendOpenRouterChat>>
}
