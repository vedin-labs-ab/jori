import {
  type ChatAssistantMessage,
  type ChatResult,
} from "@openrouter/sdk/models"
import { afterEach, expect, test, vi } from "vitest"
import { generateOpenRouterImage } from "./openrouter"

const openRouter = vi.hoisted(() => ({
  send: vi.fn(),
}))

vi.mock("../../../model/openrouter", () => ({
  sendOpenRouterChat: openRouter.send,
}))

afterEach(() => {
  vi.unstubAllGlobals()
})

test("asks for an image and decodes the returned data URL", async () => {
  openRouter.send.mockResolvedValue(
    chatResult({
      images: [{ imageUrl: { url: "data:image/png;base64,am9yaQ==" } }],
      role: "assistant",
    })
  )

  expect(await generateOpenRouterImage("A hero image for Jori.")).toEqual({
    bytes: new Uint8Array([0x6a, 0x6f, 0x72, 0x69]),
    mimeType: "image/png",
    model: "google/gemini-3.1-flash-image",
    requestId: "gen_1",
  })
  expect(openRouter.send).toHaveBeenCalledWith({
    messages: [{ content: "A hero image for Jori.", role: "user" }],
    modalities: ["image", "text"],
    model: "google/gemini-3.1-flash-image",
    provider: { requireParameters: true, sort: "price" },
  })
})

test("downloads an image the model returned by link", async () => {
  openRouter.send.mockResolvedValue(
    chatResult({
      images: [{ imageUrl: { url: "https://images.example/hero" } }],
      role: "assistant",
    })
  )
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json(null, {
        headers: { "content-type": "image/webp" },
      })
    )
  )

  const generated = await generateOpenRouterImage("A hero image for Jori.")

  expect(generated.mimeType).toBe("image/webp")
  expect(new TextDecoder().decode(generated.bytes)).toBe("null")
})

test("fails when the model answered without an image", async () => {
  openRouter.send.mockResolvedValue(
    chatResult({ content: "No image was produced.", role: "assistant" })
  )

  await expect(generateOpenRouterImage("A hero image.")).rejects.toThrow(
    "OpenRouter did not return a generated image."
  )
})

function chatResult(message: ChatAssistantMessage): ChatResult {
  return {
    choices: [{ finishReason: "stop", index: 0, message }],
    created: 0,
    id: "gen_1",
    model: "google/gemini-3.1-flash-image",
    object: "chat.completion",
    systemFingerprint: null,
  }
}
