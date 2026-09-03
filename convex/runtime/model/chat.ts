import {
  type ChatFunctionTool,
  type ChatMessages,
  type ChatRequest,
  type ChatResult,
  type ChatToolCall,
} from "@openrouter/sdk/models"
import { joriModel } from "../../../contracts/billing"
import { decodeJsonObject, type JsonObject } from "../../../contracts/json"
import { sendOpenRouterChat } from "../../model/openrouter"
import { ingestReasoning } from "./reasoning"
import { readModelTokens } from "./tokens"
import {
  type ModelMessage,
  type ModelResponse,
  type ModelRuntime,
  type ModelTool,
  type ModelToolCall,
} from "./types"

// The first turn produces the start update and is optimized for latency; later
// turns do the actual work and reason harder. Effort levels are code config.
const firstTurnReasoningEffort = "low"
const defaultReasoningEffort = "medium"

type ModelSettings = Pick<ChatRequest, "provider" | "reasoning">

export class OpenRouterModel implements ModelRuntime {
  /** The session is the run: OpenRouter routes every call that shares it to
   *  the same provider, so the prompt prefix cached by one turn is there for
   *  the next. */
  constructor(private readonly session: string) {}

  async complete(args: {
    firstTurn: boolean
    messages: ModelMessage[]
    tools: ModelTool[]
  }): Promise<ModelResponse> {
    const result = await sendOpenRouterChat({
      messages: toChatMessages(args.messages),
      model: joriModel,
      sessionId: this.session,
      // An empty tool list is left out rather than sent: providers differ on
      // whether an empty array is a request without tools or a bad request.
      ...(args.tools.length === 0
        ? {}
        : { toolChoice: "auto" as const, tools: args.tools.map(toChatTool) }),
      ...createOpenRouterModelSettings(args.firstTurn),
    })

    return readModelResponse(result)
  }
}

function createOpenRouterModelSettings(firstTurn: boolean): ModelSettings {
  return {
    // Providers that silently drop tool definitions cannot run the loop.
    provider: { requireParameters: true },
    reasoning: {
      effort: firstTurn ? firstTurnReasoningEffort : defaultReasoningEffort,
    },
  }
}

function readModelResponse(result: ChatResult): ModelResponse {
  const choice = result.choices[0]

  if (choice === undefined) {
    throw new Error("The model returned no choices.")
  }

  const content = readText(choice.message.content)
  const reasoning = ingestReasoning(joriModel, choice.message.reasoning)
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
