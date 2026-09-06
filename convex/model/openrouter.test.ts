import { type ChatResult, type ChatStreamChunk } from "@openrouter/sdk/models"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"
import { requireOpenRouterConfig, sendOpenRouterChat } from "./openrouter"

const sdk = vi.hoisted(() => ({ send: vi.fn() }))

vi.mock("@openrouter/sdk/core", () => ({ OpenRouterCore: class {} }))

// The standalone function answers a result; the mock takes the request the
// way the root client's method did and wraps its answer.
vi.mock("@openrouter/sdk/funcs/chatSend", () => ({
  chatSend: async (_client: unknown, request: unknown) => {
    try {
      return { ok: true, value: await sdk.send(request) }
    } catch (error) {
      return { error, ok: false }
    }
  },
}))

const environmentNames = [
  "CONVEX_SITE_URL",
  "OPENROUTER_API_KEY",
  "OPENROUTER_APP_CATEGORIES",
  "OPENROUTER_APP_TITLE",
  "OPENROUTER_HTTP_REFERER",
] as const

const originalEnvironment = new Map(
  environmentNames.map((name) => [name, process.env[name]])
)

describe("openrouter client", () => {
  afterEach(() => {
    for (const name of environmentNames) {
      const value = originalEnvironment.get(name)

      if (value === undefined) {
        delete process.env[name]
      } else {
        process.env[name] = value
      }
    }
  })

  test("requires an API key", () => {
    delete process.env.OPENROUTER_API_KEY

    expect(() => requireOpenRouterConfig()).toThrow(
      "Missing OPENROUTER_API_KEY"
    )
  })

  test("reads API key and default attribution", () => {
    process.env.OPENROUTER_API_KEY = " key "
    process.env.CONVEX_SITE_URL = " https://jori.example "
    delete process.env.OPENROUTER_APP_CATEGORIES
    delete process.env.OPENROUTER_APP_TITLE
    delete process.env.OPENROUTER_HTTP_REFERER

    expect(requireOpenRouterConfig()).toEqual({
      apiKey: "key",
      appCategories: "cloud-agent",
      appTitle: "Jori",
      httpReferer: "https://jori.example",
    })
  })

  test("allows OpenRouter attribution overrides", () => {
    process.env.OPENROUTER_API_KEY = "key"
    process.env.CONVEX_SITE_URL = "https://convex.example"
    process.env.OPENROUTER_APP_CATEGORIES = "job"
    process.env.OPENROUTER_APP_TITLE = "Custom Jori"
    process.env.OPENROUTER_HTTP_REFERER = "https://app.example"

    expect(requireOpenRouterConfig()).toEqual({
      apiKey: "key",
      appCategories: "job",
      appTitle: "Custom Jori",
      httpReferer: "https://app.example",
    })
  })
})

describe("openrouter chat", () => {
  const request = {
    messages: [{ content: "Hi", role: "user" as const }],
    model: "openai/gpt-5",
  }

  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = "key"
    sdk.send.mockReset()
  })

  test("streams the request and folds the chunks", async () => {
    const onDelta = vi.fn()

    sdk.send.mockResolvedValue(stream([chunk("Hel"), chunk("lo", "stop")]))

    const result = await sendOpenRouterChat(request, onDelta)

    expect(sdk.send).toHaveBeenCalledTimes(1)
    expect(sdk.send).toHaveBeenCalledWith({
      chatRequest: { ...request, stream: true },
    })
    expect(result.choices[0]?.message.content).toBe("Hello")
    expect(onDelta).toHaveBeenCalledTimes(2)
  })

  test("takes a whole result answered to a stream request", async () => {
    sdk.send.mockResolvedValue(whole("Done."))

    expect(await sendOpenRouterChat(request)).toEqual(whole("Done."))
    expect(sdk.send).toHaveBeenCalledTimes(1)
  })

  test("asks again without streaming when no stream opens", async () => {
    sdk.send
      .mockRejectedValueOnce(new Error("Streaming is not supported"))
      .mockResolvedValueOnce(whole("Done."))

    expect(await sendOpenRouterChat(request)).toEqual(whole("Done."))
    expect(sdk.send).toHaveBeenCalledTimes(2)
    expect(sdk.send).toHaveBeenLastCalledWith({
      chatRequest: { ...request, stream: false },
    })
  })

  test("a stream that breaks after its first chunk fails the call", async () => {
    sdk.send.mockResolvedValue(
      (async function* () {
        yield chunk("Hel")
        throw new Error("Connection reset")
      })()
    )

    await expect(sendOpenRouterChat(request)).rejects.toThrow(
      "Connection reset"
    )
    expect(sdk.send).toHaveBeenCalledTimes(1)
  })

  test("a plain answer to the second request is still required", async () => {
    sdk.send
      .mockRejectedValueOnce(new Error("Streaming is not supported"))
      .mockResolvedValueOnce(stream([]))

    await expect(sendOpenRouterChat(request)).rejects.toThrow(
      "OpenRouter returned a stream for a non-streaming request"
    )
  })
})

async function* stream(chunks: ChatStreamChunk[]) {
  yield* chunks
}

function chunk(
  content: string,
  finishReason: "stop" | null = null
): ChatStreamChunk {
  return {
    choices: [{ delta: { content }, finishReason, index: 0 }],
    created: 1,
    id: "gen_1",
    model: "openai/gpt-5",
    object: "chat.completion.chunk",
  }
}

function whole(content: string): ChatResult {
  return {
    choices: [
      {
        finishReason: "stop",
        index: 0,
        message: { content, role: "assistant" },
      },
    ],
    created: 1,
    id: "gen_1",
    model: "openai/gpt-5",
    object: "chat.completion",
    systemFingerprint: null,
  }
}
