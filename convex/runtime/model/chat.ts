import {
  type ChatFunctionTool,
  type ChatMessages,
  type ChatRequest,
  type ChatResult,
  type ChatToolCall,
} from "@openrouter/sdk/models"
import { decodeJsonObject, type JsonObject } from "../../../contracts/json"
import { catalogModel } from "../../../contracts/models/catalog"
import {
  defaultSelection,
  type ModelSelection,
} from "../../../contracts/models/selection"
import { providerPreferences, sendOpenRouterChat } from "../../model/openrouter"
import { ingestReasoning, readsReasoning } from "./reasoning"
import { readModelTokens } from "./tokens"
import {
  type ModelDelta,
  type ModelMessage,
  type ModelResponse,
  type ModelRuntime,
  type ModelTool,
  type ModelToolCall,
} from "./types"

/** The request's model settings: the selection's effort for every turn,
 *  since the provider's prompt cache does not carry across an effort
 *  change, and none for a model that does not reason. */
function modelSettings(
  selection: ModelSelection
): Pick<ChatRequest, "provider" | "reasoning"> {
  return {
    provider: providerPreferences(),
    ...(catalogModel(selection.model).reasoning
      ? { reasoning: { effort: selection.effort } }
      : {}),
  }
}

export class OpenRouterModel implements ModelRuntime {
  readonly model: string

  /** The session is the run: OpenRouter routes every call that shares it to
   *  the same provider, so the prompt prefix cached by one turn is there for
   *  the next. The selection is the run's, or the default when it has
   *  none. */
  constructor(
    private readonly session: string,
    private readonly selection: ModelSelection = defaultSelection
  ) {
    this.model = selection.model
  }

  async complete(args: {
    messages: ModelMessage[]
    onDelta?: (delta: ModelDelta) => void
    tools: ModelTool[]
  }): Promise<ModelResponse> {
    const result = await sendOpenRouterChat(
      {
        messages: toChatMessages(args.messages),
        model: this.model,
        sessionId: this.session,
        // An empty tool list is left out rather than sent: providers differ
        // on whether an empty array is a request without tools or a bad
        // request.
        ...(args.tools.length === 0
          ? {}
          : { toolChoice: "auto" as const, tools: args.tools.map(toChatTool) }),
        ...modelSettings(this.selection),
      },
      args.onDelta === undefined
        ? undefined
        : deltaListener(this.model, args.onDelta)
    )

    return readModelResponse(this.model, result)
  }
}

// The draft shows reasoning under the rule the response keeps it by, so a
// model whose raw reasoning is dropped at the end never streams it either.
function deltaListener(model: string, onDelta: (delta: ModelDelta) => void) {
  if (readsReasoning(model)) {
    return onDelta
  }

  return ({ content, toolCalls }: ModelDelta) => {
    if (content !== undefined || toolCalls !== undefined) {
      onDelta({
        ...(content === undefined ? {} : { content }),
        ...(toolCalls === undefined ? {} : { toolCalls }),
      })
    }
  }
}

function readModelResponse(model: string, result: ChatResult): ModelResponse {
  const choice = result.choices[0]

  if (choice === undefined) {
    throw new Error("The model returned no choices.")
  }

  const content = readText(choice.message.content)
  const reasoning = ingestReasoning(model, choice.message.reasoning)
  const tokens = readModelTokens(result.usage)
  const toolCalls = (choice.message.toolCalls ?? []).flatMap(readToolCall)

  if (toolCalls.length === 0) {
    return { content, reasoning, tokens, type: "stop" }
  }

  return {
    content: content === "" ? null : content,
    reasoning,
    toolCalls,
    tokens,
    type: "tool_calls",
  }
}

// Only plain text carries meaning to the loop, so structured content parts
// read as no text at all.
function readText(content: unknown) {
  return typeof content === "string" ? content : ""
}

function toChatMessages(messages: ModelMessage[]): ChatMessages[] {
  const instructions: string[] = []
  const turns: ChatMessages[] = []

  for (const message of messages) {
    if (message.role === "system") {
      instructions.push(message.content)
      continue
    }

    turns.push(toChatMessage(message))
  }

  if (instructions.length === 0) {
    return turns
  }

  return [{ content: instructions.join("\n\n"), role: "system" }, ...turns]
}

function toChatMessage(message: ModelMessage): ChatMessages {
  if (message.role === "assistant") {
    return {
      content: message.content,
      role: "assistant",
      toolCalls: message.toolCalls?.map(toChatToolCall),
    }
  }

  if (message.role === "tool") {
    return {
      content: message.content,
      role: "tool",
      toolCallId: message.toolCallId,
    }
  }

  return { content: message.content, role: message.role }
}

function toChatToolCall(toolCall: ModelToolCall): ChatToolCall {
  return {
    function: {
      arguments: JSON.stringify(toolCall.args),
      name: toolCall.name,
    },
    id: toolCall.id,
    type: "function",
  }
}

function toChatTool(modelTool: ModelTool): ChatFunctionTool {
  return {
    function: {
      description: modelTool.description,
      name: modelTool.name,
      parameters: modelTool.inputSchema,
    },
    type: "function",
  }
}

function readToolCall(toolCall: ChatToolCall): ModelToolCall[] {
  const args = readToolArguments(toolCall.function.arguments)

  // Arguments that are not a JSON object name no input any tool can run, so
  // the call is dropped instead of repaired.
  if (args === undefined) {
    return []
  }

  return [{ args, id: toolCall.id, name: toolCall.function.name }]
}

function readToolArguments(value: string): JsonObject | undefined {
  // Tools without parameters are called with an empty argument string.
  const text = value.trim() === "" ? "{}" : value

  try {
    return decodeJsonObject(text)
  } catch {
    return undefined
  }
}
