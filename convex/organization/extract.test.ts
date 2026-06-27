import { beforeEach, describe, expect, test, vi } from "vitest"
import { sendOpenRouterChat } from "../model"
import { promptTemplates } from "../prompts/generated"
import { renderPromptTemplate } from "../prompts/render"
import { extractFacts } from "./extract"

vi.mock("../model", () => ({
  sendOpenRouterChat: vi.fn(),
}))

const sendOpenRouterChatMock = vi.mocked(sendOpenRouterChat)

describe("extractFacts", () => {
  beforeEach(() => {
    sendOpenRouterChatMock.mockReset()
    sendOpenRouterChatMock.mockResolvedValue(
      openRouterResult({
        aliases: [],
        domains: ["https://milo.example"],
        name: "Milo",
        summary: "Milo helps teams move work forward inside their tools.",
      })
    )
  })

  test("sends the organization discovery prompt from the prompt registry", async () => {
    const input = {
      pages: [
        {
          text: "Milo helps teams move work forward inside their tools.",
          url: "https://milo.example",
        },
      ],
      primaryUrl: "https://milo.example",
    }

    await expect(extractFacts(input)).resolves.toMatchObject({
      domains: ["milo.example"],
      name: "Milo",
    })

    expect(sendOpenRouterChatMock).toHaveBeenCalledTimes(1)

    const [request] = sendOpenRouterChatMock.mock.calls[0] ?? []

    expect(request?.messages).toEqual([
      {
        content: renderPromptTemplate(
          promptTemplates["organization/discovery"],
          {}
        ),
        role: "system",
      },
      {
        content: JSON.stringify({
          primaryUrl: input.primaryUrl,
          pages: input.pages,
        }),
        role: "user",
      },
    ])
  })
})

function openRouterResult(content: Record<string, unknown>) {
  return {
    choices: [
      {
        finishReason: "stop",
        message: { content: JSON.stringify(content) },
      },
    ],
  } as unknown as Awaited<ReturnType<typeof sendOpenRouterChat>>
}
