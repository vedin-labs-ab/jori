import { afterEach, expect, test, vi } from "vitest"
import { BasetenModelRuntime, createBasetenChatRequest } from "./baseten"
import { type ModelMessage, type ModelTool } from "./types"

const config = {
  apiKey: "key",
  endpoint: "https://baseten.test/v1/chat/completions",
  model: "zai-org/GLM-5.2",
}

const slackTool = {
  description: "Post a Slack message.",
  inputSchema: {
    additionalProperties: false,
    properties: {
      channel: { type: "string" },
      text: { type: "string" },
    },
    required: ["channel", "text"],
    type: "object",
  },
  name: "conversations_add_message",
} satisfies ModelTool

const requestMessages = [
  {
    content: "system",
    role: "system",
  },
  {
    content: null,
    role: "assistant",
    toolCalls: [
      {
        args: { channel: "C123", text: "Hello" },
        id: "call_1",
        name: "conversations_add_message",
      },
    ],
  },
  {
    content: '{"ok":true}',
    role: "tool",
    toolCallId: "call_1",
    toolName: "conversations_add_message",
  },
] satisfies ModelMessage[]

const expectedToolRequest = {
  chat_template_args: {
    enable_thinking: true,
  },
  messages: [
    {
      content: "system",
      role: "system",
    },
    {
      content: null,
      role: "assistant",
      tool_calls: [
        {
          function: {
            arguments: '{"channel":"C123","text":"Hello"}',
            name: "conversations_add_message",
          },
          id: "call_1",
          type: "function",
        },
      ],
    },
    {
      content: '{"ok":true}',
      role: "tool",
      tool_call_id: "call_1",
    },
  ],
  model: "zai-org/GLM-5.2",
  stream: false,
  tool_choice: "auto",
  tools: [
    {
      function: {
        description: "Post a Slack message.",
        name: "conversations_add_message",
        parameters: slackTool.inputSchema,
      },
      type: "function",
    },
  ],
}

const basetenToolResponse = {
  choices: [
    {
      message: {
        content: null,
        tool_calls: [
          {
            function: {
              arguments: '{"channel":"C123","text":"Hello"}',
              name: "conversations_add_message",
            },
            id: "call_1",
            type: "function",
          },
        ],
      },
    },
  ],
}

afterEach(() => {
  vi.unstubAllGlobals()
})

test("creates OpenAI-compatible requests with GLM thinking enabled", () => {
  expect(
    createBasetenChatRequest({
      config,
      messages: requestMessages,
      tools: [slackTool],
    })
  ).toEqual(expectedToolRequest)
})

test("omits tools when the model call is tool-less", () => {
  const request = createBasetenChatRequest({
    config,
    messages: [{ content: "stop now", role: "user" }],
    tools: [],
  })

  expect(request).toEqual({
    chat_template_args: {
      enable_thinking: true,
    },
    messages: [{ content: "stop now", role: "user" }],
    model: "zai-org/GLM-5.2",
    stream: false,
    tool_choice: "none",
  })
})

test("adds the initial user turn when only system messages exist", () => {
  const request = createBasetenChatRequest({
    config,
    messages: [{ content: "system", role: "system" }],
    tools: [],
  })

  expect(request.messages).toEqual([
    { content: "system", role: "system" },
    { content: "Begin executing the current task.", role: "user" },
  ])
})

test("parses tool calls from Baseten responses", async () => {
  const fetchMock = vi.fn(async () => {
    return new Response(JSON.stringify(basetenToolResponse), { status: 200 })
  })
  vi.stubGlobal("fetch", fetchMock)

  const runtime = new BasetenModelRuntime(config)
  const result = await runtime.complete({
    messages: [{ content: "system", role: "system" }],
    tools: [slackTool],
  })

  expect(result).toEqual({
    content: null,
    toolCalls: [
      {
        args: { channel: "C123", text: "Hello" },
        id: "call_1",
        name: "conversations_add_message",
      },
    ],
    type: "tool_calls",
  })
  expect(fetchMock).toHaveBeenCalledWith(
    "https://baseten.test/v1/chat/completions",
    expect.objectContaining({
      headers: {
        authorization: "Bearer key",
        "content-type": "application/json",
      },
      method: "POST",
    })
  )
})
