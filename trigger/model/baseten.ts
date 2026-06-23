import { encodeJson, toJsonObject } from "../../contracts/json"
import {
  type BasetenRuntimeConfig,
  requireBasetenRuntimeConfig,
} from "./config"
import { beginExecutionMessage, readToolInput } from "./shared"
import {
  type ModelMessage,
  type ModelResponse,
  type ModelRuntime,
  type ModelTool,
  type ModelToolCall,
} from "./types"

type BasetenMessage =
  | {
      content: string
      role: "system" | "user"
    }
  | {
      content: string | null
      role: "assistant"
      tool_calls?: BasetenToolCall[]
    }
  | {
      content: string
      role: "tool"
      tool_call_id: string
    }

type BasetenTool = {
  function: {
    description: string
    name: string
    parameters: ModelTool["inputSchema"]
  }
  type: "function"
}

type BasetenToolCall = {
  function: {
    arguments: string
    name: string
  }
  id: string
  type: "function"
}

type BasetenChatRequest = {
  chat_template_args: {
    enable_thinking: true
  }
  messages: BasetenMessage[]
  model: string
  stream: false
  tool_choice: "auto" | "none"
  tools?: BasetenTool[]
}

type BasetenChatResponse = {
  choices?: Array<{
    message?: {
      content?: string | null
      tool_calls?: unknown
    }
  }>
}

export class BasetenModelRuntime implements ModelRuntime {
  private readonly config: BasetenRuntimeConfig

  constructor(config = requireBasetenRuntimeConfig()) {
    this.config = config
  }

  async complete(args: {
    messages: ModelMessage[]
    tools: ModelTool[]
  }): Promise<ModelResponse> {
    const response = await this.sendChat(createRequest(this.config, args))
    const message = response.choices?.[0]?.message

    if (message === undefined) {
      throw new Error("Baseten response did not include a message.")
    }

    const toolCalls = readToolCalls(message.tool_calls)
    const content = message.content ?? ""

    if (toolCalls.length === 0) {
      return {
        content,
        type: "stop",
      }
    }

    return {
      content: content === "" ? null : content,
      toolCalls,
      type: "tool_calls",
    }
  }

  private async sendChat(request: BasetenChatRequest) {
    const response = await fetch(this.config.endpoint, {
      body: JSON.stringify(request),
      headers: {
        authorization: `Bearer ${this.config.apiKey}`,
        "content-type": "application/json",
      },
      method: "POST",
    })
    const body = await response.text()

    if (!response.ok) {
      throw new Error(`Baseten chat failed: ${response.status} ${body}`)
    }

    const parsed: unknown = JSON.parse(body)

    return toJsonObject(parsed) as unknown as BasetenChatResponse
  }
}

export function createBasetenChatRequest(args: {
  config: BasetenRuntimeConfig
  messages: ModelMessage[]
  tools: ModelTool[]
}) {
  return createRequest(args.config, args)
}

function createRequest(
  config: BasetenRuntimeConfig,
  args: {
    messages: ModelMessage[]
    tools: ModelTool[]
  }
): BasetenChatRequest {
  return {
    chat_template_args: {
      enable_thinking: true,
    },
    messages: toBasetenMessages(args.messages),
    model: config.model,
    stream: false,
    tool_choice: args.tools.length === 0 ? "none" : "auto",
    ...(args.tools.length === 0
      ? {}
      : { tools: args.tools.map(toBasetenTool) }),
  }
}

function toBasetenMessages(messages: ModelMessage[]) {
  const basetenMessages = messages.map(toBasetenMessage)

  if (messages.some((message) => message.role !== "system")) {
    return basetenMessages
  }

  return [
    ...basetenMessages,
    {
      content: beginExecutionMessage,
      role: "user" as const,
    },
  ]
}

function toBasetenMessage(message: ModelMessage): BasetenMessage {
  if (message.role === "assistant") {
    return toBasetenAssistantMessage(message)
  }

  if (message.role === "tool") {
    return {
      content: message.content,
      role: "tool",
      tool_call_id: message.toolCallId,
    }
  }

  return {
    content: message.content,
    role: message.role,
  }
}

function toBasetenAssistantMessage(
  message: Extract<ModelMessage, { role: "assistant" }>
): BasetenMessage {
  const toolCalls = message.toolCalls?.map(toBasetenToolCall)

  return {
    content: message.content,
    role: "assistant",
    ...(toolCalls === undefined || toolCalls.length === 0
      ? {}
      : { tool_calls: toolCalls }),
  }
}

function toBasetenTool(modelTool: ModelTool): BasetenTool {
  return {
    function: {
      description: modelTool.description,
      name: modelTool.name,
      parameters: modelTool.inputSchema,
    },
    type: "function",
  }
}

function toBasetenToolCall(toolCall: ModelToolCall): BasetenToolCall {
  return {
    function: {
      arguments: encodeJson(toolCall.args),
      name: toolCall.name,
    },
    id: toolCall.id,
    type: "function",
  }
}

function readToolCalls(value: unknown): ModelToolCall[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap(readToolCall)
}

function readToolCall(value: unknown): ModelToolCall[] {
  if (!isBasetenToolCall(value)) {
    return []
  }

  return [
    {
      args: readToolArguments(value.function.arguments),
      id: value.id,
      name: value.function.name,
    },
  ]
}

function readToolArguments(value: unknown) {
  if (typeof value === "string") {
    const parsed: unknown = JSON.parse(value)

    return readToolInput(parsed)
  }

  return readToolInput(value)
}

function isBasetenToolCall(value: unknown): value is BasetenToolCall {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false
  }

  const call = value as Record<string, unknown>
  const fn = call.function

  return (
    call.type === "function" &&
    typeof call.id === "string" &&
    isBasetenToolCallFunction(fn)
  )
}

function isBasetenToolCallFunction(
  value: unknown
): value is BasetenToolCall["function"] {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false
  }

  const fn = value as Record<string, unknown>

  return typeof fn.name === "string" && typeof fn.arguments === "string"
}
