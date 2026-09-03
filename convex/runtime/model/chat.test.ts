import {
  type ChatAssistantMessage,
  type ChatResult,
} from "@openrouter/sdk/models"
import { expect, test, vi } from "vitest"
import { joriModel } from "../../../contracts/billing"
import { OpenRouterModel } from "./chat"
import { type ModelMessage, type ModelTool } from "./types"

const openRouter = vi.hoisted(() => ({
  send: vi.fn(),
}))

vi.mock("../../model/openrouter", () => ({
  sendOpenRouterChat: openRouter.send,
}))

const readTool: ModelTool = {
  description: "Read a file.",
  inputSchema: { properties: { path: { type: "string" } }, type: "object" },
  name: "read",
}

test("sends the transcript as one system message and the turns after it", async () => {
  openRouter.send.mockResolvedValue(
    chatResult({ content: "Done.", role: "assistant" })
  )

  const messages: ModelMessage[] = [
    { content: "You are Jori.", role: "system" },
    { content: "The workspace is Copperline.", role: "system" },
    { content: "Ship the release.", role: "user" },
    {
      content: "Reading the notes.",
      role: "assistant",
      toolCalls: [{ args: { path: "notes.md" }, id: "call_1", name: "read" }],
    },
    {
      content: "release checklist",
      role: "tool",
      toolCallId: "call_1",
      toolName: "read",
    },
  ]

  await new OpenRouterModel("run_1").complete({
    firstTurn: true,
    messages,
    tools: [readTool],
  })

  expect(openRouter.send).toHaveBeenCalledWith({
    messages: [
      {
        content: "You are Jori.\n\nThe workspace is Copperline.",
        role: "system",
      },
      { content: "Ship the release.", role: "user" },
      {
        content: "Reading the notes.",
        role: "assistant",
        toolCalls: [
          {
            function: { arguments: '{"path":"notes.md"}', name: "read" },
            id: "call_1",
            type: "function",
          },
        ],
      },
      { content: "release checklist", role: "tool", toolCallId: "call_1" },
    ],
    model: joriModel,
    sessionId: "run_1",
    provider: { requireParameters: true },
    reasoning: { effort: "low" },
    toolChoice: "auto",
    tools: [
      {
        function: {
          description: "Read a file.",
          name: "read",
          parameters: readTool.inputSchema,
        },
        type: "function",
      },
    ],
  })
})

test("reasons harder after the first turn and sends no tool list when there are none", async () => {
  openRouter.send.mockResolvedValue(
    chatResult({ content: "Done.", role: "assistant" })
  )

  await new OpenRouterModel("run_1").complete({
    firstTurn: false,
    messages: [{ content: "Ship the release.", role: "user" }],
    tools: [],
  })

  expect(openRouter.send).toHaveBeenCalledWith(
    expect.objectContaining({ reasoning: { effort: "medium" } })
  )
  expect(openRouter.send.mock.lastCall?.[0]).not.toHaveProperty("tools")
  expect(openRouter.send.mock.lastCall?.[0]).not.toHaveProperty("toolChoice")
})

test("reads a stop response with its reasoning and tokens", async () => {
  openRouter.send.mockResolvedValue(
    chatResult(
      {
        content: "The release is out.",
        reasoning: "checked the checklist",
        role: "assistant",
      },
      {
        completionTokens: 40,
        completionTokensDetails: { reasoningTokens: 12 },
        promptTokens: 900,
        promptTokensDetails: { cachedTokens: 700 },
        totalTokens: 940,
      }
    )
  )

  expect(
    await new OpenRouterModel("run_1").complete({
      firstTurn: false,
      messages: [{ content: "Ship the release.", role: "user" }],
      tools: [readTool],
    })
  ).toEqual({
    content: "The release is out.",
    reasoning: "checked the checklist",
    tokens: {
      cacheRead: 700,
      cacheWrite: 0,
      input: 900,
      output: 40,
      reasoning: 12,
      total: 940,
      uncached: 200,
    },
    type: "stop",
  })
})

test("parses tool calls and reports empty text as no content", async () => {
  openRouter.send.mockResolvedValue(
    chatResult({
      content: "",
      role: "assistant",
      toolCalls: [
        {
          function: { arguments: '{"path":"notes.md"}', name: "read" },
          id: "call_1",
          type: "function",
        },
        {
          function: { arguments: "  ", name: "list" },
          id: "call_2",
          type: "function",
        },
      ],
    })
  )

  expect(
    await new OpenRouterModel("run_1").complete({
      firstTurn: false,
      messages: [{ content: "Ship the release.", role: "user" }],
      tools: [readTool],
    })
  ).toMatchObject({
    content: null,
    toolCalls: [
      { args: { path: "notes.md" }, id: "call_1", name: "read" },
      { args: {}, id: "call_2", name: "list" },
    ],
    type: "tool_calls",
  })
})

test("drops a call whose arguments are not a JSON object", async () => {
  openRouter.send.mockResolvedValue(
    chatResult({
      content: "Trying to read.",
      role: "assistant",
      toolCalls: [
        {
          function: { arguments: "{ not json", name: "read" },
          id: "call_1",
          type: "function",
        },
        {
          function: { arguments: '"notes.md"', name: "read" },
          id: "call_2",
          type: "function",
        },
      ],
    })
  )

  expect(
    await new OpenRouterModel("run_1").complete({
      firstTurn: false,
      messages: [{ content: "Ship the release.", role: "user" }],
      tools: [readTool],
    })
  ).toMatchObject({
    content: "Trying to read.",
    type: "stop",
  })
})

function chatResult(
  message: ChatAssistantMessage,
  usage?: ChatResult["usage"]
): ChatResult {
  return {
    choices: [{ finishReason: "stop", index: 0, message }],
    created: 0,
    id: "gen_1",
    model: joriModel,
    object: "chat.completion",
    systemFingerprint: null,
    usage,
  }
}
