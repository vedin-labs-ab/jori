import {
  type ChatFinishReasonEnum,
  type ChatResult,
  type ChatStreamChunk,
  type ChatStreamToolCall,
  type ChatToolCall,
  type ChatUsage,
} from "@openrouter/sdk/models"

/** What one chunk of a streamed completion adds: assistant text, the
 *  model's reasoning, and fragments of tool call arguments, each named by
 *  the call's index. */
export type ChatDelta = {
  content?: string
  reasoning?: string
  toolCalls?: ChatToolCallDelta[]
}

export type ChatToolCallDelta = {
  argumentsDelta: string
  index: number
  name?: string
}

type ToolCallFold = {
  arguments: string
  id: string
  name: string
}

type ChoiceFold = {
  content: string
  finishReason: ChatFinishReasonEnum | null
  reasoning: string
  toolCalls: Map<number, ToolCallFold>
}

type StreamFold = {
  choice: ChoiceFold | null
  created: number
  id: string
  model: string
  usage: ChatUsage | undefined
}

/**
 * Folds a streamed completion into the result a non-streaming call returns,
 * so one reader serves both. Text and reasoning accumulate, tool calls
 * assemble by index with their argument fragments in order, and the usage
 * comes from the last chunk that reports it. A chunk carrying an error is
 * the provider failing mid-stream behind a 200, so it fails the call.
 */
export async function foldChatStream(
  chunks: AsyncIterable<ChatStreamChunk>,
  onDelta?: (delta: ChatDelta) => void
): Promise<ChatResult> {
  const fold: StreamFold = {
    choice: null,
    created: 0,
    id: "",
    model: "",
    usage: undefined,
  }

  for await (const chunk of chunks) {
    if (chunk.error !== undefined) {
      throw new Error(
        `OpenRouter stream failed (${chunk.error.code}): ${chunk.error.message}`
      )
    }

    const delta = foldChunk(fold, chunk)

    if (delta !== null) {
      onDelta?.(delta)
    }
  }

  return foldedResult(fold)
}

function foldChunk(fold: StreamFold, chunk: ChatStreamChunk): ChatDelta | null {
  fold.created = chunk.created
  fold.id = chunk.id
  fold.model = chunk.model
  fold.usage = chunk.usage ?? fold.usage

  const choice = chunk.choices[0]

  if (choice === undefined) {
    return null
  }

  fold.choice ??= {
    content: "",
    finishReason: null,
    reasoning: "",
    toolCalls: new Map(),
  }

  const folded = fold.choice
  const content = choice.delta.content ?? ""
  const reasoning = choice.delta.reasoning ?? ""
  const toolCalls = (choice.delta.toolCalls ?? []).map((fragment) =>
    foldToolCall(folded.toolCalls, fragment)
  )

  folded.content += content
  folded.finishReason = choice.finishReason ?? folded.finishReason
  folded.reasoning += reasoning

  if (content === "" && reasoning === "" && toolCalls.length === 0) {
    return null
  }

  return {
    ...(content === "" ? {} : { content }),
    ...(reasoning === "" ? {} : { reasoning }),
    ...(toolCalls.length === 0 ? {} : { toolCalls }),
  }
}

// An OpenAI-compatible stream names a call once, on its first fragment, and
// then sends its arguments as string pieces in order under the same index.
function foldToolCall(
  toolCalls: Map<number, ToolCallFold>,
  fragment: ChatStreamToolCall
): ChatToolCallDelta {
  const call = toolCalls.get(fragment.index) ?? {
    arguments: "",
    id: "",
    name: "",
  }
  const argumentsDelta = fragment.function?.arguments ?? ""
  const name = fragment.function?.name

  call.arguments += argumentsDelta
  call.id = fragment.id ?? call.id
  call.name = name ?? call.name
  toolCalls.set(fragment.index, call)

  return {
    argumentsDelta,
    index: fragment.index,
    ...(name === undefined ? {} : { name }),
  }
}

function foldedResult(fold: StreamFold): ChatResult {
  return {
    choices: fold.choice === null ? [] : [foldedChoice(fold.choice)],
    created: fold.created,
    id: fold.id,
    model: fold.model,
    object: "chat.completion",
    systemFingerprint: null,
    usage: fold.usage,
  }
}

function foldedChoice(choice: ChoiceFold): ChatResult["choices"][number] {
  const toolCalls = [...choice.toolCalls.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, call]) => foldedToolCall(call))

  return {
    finishReason: choice.finishReason,
    index: 0,
    message: {
      content: choice.content,
      role: "assistant",
      ...(choice.reasoning === "" ? {} : { reasoning: choice.reasoning }),
      ...(toolCalls.length === 0 ? {} : { toolCalls }),
    },
  }
}

function foldedToolCall(call: ToolCallFold): ChatToolCall {
  return {
    function: { arguments: call.arguments, name: call.name },
    id: call.id,
    type: "function",
  }
}
