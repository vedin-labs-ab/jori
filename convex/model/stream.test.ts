import {
  type ChatStreamChunk,
  type ChatStreamDelta,
} from "@openrouter/sdk/models"
import { expect, test, vi } from "vitest"
import { type ChatDelta, foldChatStream } from "./stream"

const usage = { completionTokens: 12, promptTokens: 90, totalTokens: 102 }

test("folds chunks into the result a plain call returns", async () => {
  expect(await foldChatStream(stream(toolCallChunks()))).toEqual({
    choices: [
      {
        finishReason: "tool_calls",
        index: 0,
        message: {
          content: "Hello",
          reasoning: "Thinking.",
          role: "assistant",
          toolCalls: [
            {
              function: { arguments: '{"text":"Hi"}', name: "send_reply" },
              id: "call_1",
              type: "function",
            },
            {
              function: { arguments: '{"reason":"done"}', name: "finish_run" },
              id: "call_2",
              type: "function",
            },
          ],
        },
      },
    ],
    created: 1,
    id: "gen_1",
    model: "openai/gpt-5",
    object: "chat.completion",
    systemFingerprint: null,
    usage,
  })
})

test("offers what each chunk adds, and nothing for chunks that add no text", async () => {
  const onDelta = vi.fn<(delta: ChatDelta) => void>()

  await foldChatStream(stream(toolCallChunks()), onDelta)

  expect(onDelta.mock.calls.map(([delta]) => delta)).toEqual([
    { content: "Hel" },
    { content: "lo" },
    { toolCalls: [{ argumentsDelta: "", index: 0, name: "send_reply" }] },
    {
      toolCalls: [
        { argumentsDelta: '{"te', index: 0 },
        { argumentsDelta: "", index: 1, name: "finish_run" },
      ],
    },
    { toolCalls: [{ argumentsDelta: 'xt":"Hi"}', index: 0 }] },
    { toolCalls: [{ argumentsDelta: '{"reason":"done"}', index: 1 }] },
  ])
})

test("a stream with text alone reads as a stop", async () => {
  const result = await foldChatStream(
    stream([chunk({ content: "Done." }, "stop"), { ...chunk({}), usage }])
  )

  expect(result.choices).toEqual([
    {
      finishReason: "stop",
      index: 0,
      message: { content: "Done.", role: "assistant" },
    },
  ])
  expect(result.usage).toEqual(usage)
})

test("a stream that never answers has no choices", async () => {
  expect((await foldChatStream(stream([]))).choices).toEqual([])
})

test("a chunk carrying an error fails the call", async () => {
  await expect(
    foldChatStream(
      stream([
        chunk({ content: "Hel" }),
        {
          ...chunk({}),
          choices: [],
          error: { code: 502, message: "Provider disconnected" },
        },
      ])
    )
  ).rejects.toThrow("OpenRouter stream failed (502): Provider disconnected")
})

// Text, reasoning, and two tool calls whose names arrive before their
// arguments and whose arguments interleave, then the finish and the usage.
function toolCallChunks(): ChatStreamChunk[] {
  return [
    chunk({ role: "assistant" }),
    chunk({ reasoning: "Think" }),
    chunk({ reasoning: "ing." }),
    chunk({ content: "Hel" }),
    chunk({ content: "lo" }),
    chunk({
      toolCalls: [
        {
          function: { arguments: "", name: "send_reply" },
          id: "call_1",
          index: 0,
          type: "function",
        },
      ],
    }),
    chunk({
      toolCalls: [
        { function: { arguments: '{"te' }, index: 0 },
        {
          function: { arguments: "", name: "finish_run" },
          id: "call_2",
          index: 1,
        },
      ],
    }),
    chunk({ toolCalls: [{ function: { arguments: 'xt":"Hi"}' }, index: 0 }] }),
    chunk({
      toolCalls: [{ function: { arguments: '{"reason":"done"}' }, index: 1 }],
    }),
    chunk({}, "tool_calls"),
    { ...chunk({}), choices: [], usage },
  ]
}

async function* stream(chunks: ChatStreamChunk[]) {
  yield* chunks
}

function chunk(
  delta: ChatStreamDelta,
  finishReason: "stop" | "tool_calls" | null = null
): ChatStreamChunk {
  return {
    choices: [{ delta, finishReason, index: 0 }],
    created: 1,
    id: "gen_1",
    model: "openai/gpt-5",
    object: "chat.completion.chunk",
  }
}
