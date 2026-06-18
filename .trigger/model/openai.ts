import OpenAI from "openai"
import {
  type ChatCompletionAssistantMessageParam,
  type ChatCompletionMessageParam,
  type ChatCompletionTool,
  type ChatCompletionToolMessageParam,
} from "openai/resources/chat/completions"
import {
  type ModelMessage,
  type ModelResponse,
  type ModelRuntime,
  type ModelTool,
  type ModelToolCall,
} from "./types"

export class OpenAIModelRuntime implements ModelRuntime {
  private readonly client = new OpenAI({
    apiKey: requireOpenAIKey(),
  })
  private readonly model = process.env.MILO_OPENAI_MODEL ?? "gpt-4.1"

  async complete(args: {
    messages: ModelMessage[]
    tools: ModelTool[]
  }): Promise<ModelResponse> {
    const response = await this.client.chat.completions.create({
      messages: args.messages.map(toOpenAIMessage),
      model: this.model,
      tool_choice: args.tools.length === 0 ? "none" : "auto",
      tools: args.tools.map(toOpenAITool),
    })
    const message = response.choices[0]?.message

    if (message === undefined) {
      throw new Error("OpenAI returned no message")
    }

    const toolCalls = (message.tool_calls ?? []).flatMap(readToolCall)

    if (toolCalls.length === 0) {
      return {
        content: message.content ?? "",
        type: "message",
      }
    }

    return {
      content: message.content ?? null,
      toolCalls,
      type: "tool_calls",
    }
  }
}

function toOpenAIMessage(message: ModelMessage): ChatCompletionMessageParam {
  if (message.role === "assistant") {
    return assistantMessage(message)
  }

  if (message.role === "tool") {
    return {
      content: message.content,
      role: "tool",
      tool_call_id: message.toolCallId,
    } satisfies ChatCompletionToolMessageParam
  }

  return message
}

function assistantMessage(
  message: Extract<ModelMessage, { role: "assistant" }>
) {
  const toolCalls = message.toolCalls?.map((toolCall) => ({
    id: toolCall.id,
    type: "function" as const,
    function: {
      arguments: JSON.stringify(toolCall.args),
      name: toolCall.name,
    },
  }))

  return {
    content: message.content,
    role: "assistant",
    ...(toolCalls === undefined ? {} : { tool_calls: toolCalls }),
  } satisfies ChatCompletionAssistantMessageParam
}

function toOpenAITool(tool: ModelTool): ChatCompletionTool {
  return {
    function: {
      description: tool.description,
      name: tool.name,
      parameters: tool.inputSchema,
    },
    type: "function",
  }
}

function readToolCall(
  toolCall: NonNullable<
    ChatCompletionAssistantMessageParam["tool_calls"]
  >[number]
): ModelToolCall[] {
  if (toolCall.type !== "function") {
    return []
  }

  return [
    {
      args: parseArguments(toolCall.function.arguments),
      id: toolCall.id,
      name: toolCall.function.name,
    },
  ]
}

function parseArguments(value: string): Record<string, unknown> {
  const parsed = JSON.parse(value || "{}") as unknown

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return {}
  }

  return parsed as Record<string, unknown>
}

function requireOpenAIKey() {
  const apiKey = process.env.OPENAI_API_KEY?.trim()

  if (apiKey === undefined || apiKey === "") {
    throw new Error("Missing OPENAI_API_KEY")
  }

  return apiKey
}
