import {
  createOpenRouter,
  type OpenRouterChatSettings,
} from "@openrouter/ai-sdk-provider"
import {
  type ModelMessage as AiModelMessage,
  generateText,
  jsonSchema,
  type ToolSet,
  tool,
} from "ai"
import { agentModel } from "../../contracts/billing"
import { toJsonObject } from "../../contracts/json"
import { requireOpenRouterRuntimeConfig } from "../openrouter"
import { ingestReasoning } from "./reasoning"
import {
  type ModelMessage,
  type ModelResponse,
  type ModelRuntime,
  type ModelTool,
  type ModelToolCall,
} from "./types"
import { readModelUsage } from "./usage"

// The first turn produces the start update and is optimized for latency; later
// turns do the actual work and reason harder. Effort levels are code config.
const firstTurnReasoningEffort = "low"
const defaultReasoningEffort = "medium"
const agentProviderRouting = {
  require_parameters: true,
} satisfies NonNullable<OpenRouterChatSettings["provider"]>

export class OpenRouterModelRuntime implements ModelRuntime {
  private readonly config = {
    ...requireOpenRouterRuntimeConfig(),
    model: agentModel,
  }
  private readonly provider = createOpenRouter({
    apiKey: this.config.apiKey,
    appName: this.config.appName,
    appUrl: this.config.appUrl,
  })

  async complete(args: {
    firstTurn: boolean
    messages: ModelMessage[]
    tools: ModelTool[]
  }): Promise<ModelResponse> {
    const prompt = toAiPrompt(args.messages)
    const response = await generateText({
      ...prompt,
      model: this.provider.chat(
        this.config.model,
        createOpenRouterModelSettings(args.firstTurn)
      ),
      toolChoice: args.tools.length === 0 ? "none" : "auto",
      tools: toAiTools(args.tools),
    })
    const toolCalls = response.toolCalls.flatMap(readToolCall)
    const reasoning = ingestReasoning(this.config.model, response.reasoningText)
    const usage = readModelUsage(response)

    if (toolCalls.length === 0) {
      return {
        content: response.text,
        reasoning,
        usage,
        type: "stop",
      }
    }

    return {
      content: response.text === "" ? null : response.text,
      reasoning,
      toolCalls,
      usage,
      type: "tool_calls",
    }
  }
}

export function createOpenRouterModelSettings(
  firstTurn: boolean
): OpenRouterChatSettings {
  return {
    provider: agentProviderRouting,
    reasoning: {
      effort: firstTurn ? firstTurnReasoningEffort : defaultReasoningEffort,
    },
  }
}

type NonSystemModelMessage = Exclude<ModelMessage, { role: "system" }>

function toAiPrompt(messages: ModelMessage[]) {
  const system: string[] = []
  const promptMessages: NonSystemModelMessage[] = []

  for (const message of messages) {
    if (message.role === "system") {
      system.push(message.content)
    } else {
      promptMessages.push(message)
    }
  }

  return {
    messages: promptMessages.map(toAiMessage),
    ...(system.length === 0 ? {} : { system: system.join("\n\n") }),
  }
}

function toAiMessage(message: NonSystemModelMessage): AiModelMessage {
  if (message.role === "assistant") {
    return {
      content: assistantContent(message),
      role: "assistant",
    }
  }

  if (message.role === "tool") {
    return {
      content: [
        {
          output: {
            type: "text",
            value: message.content,
          },
          toolCallId: message.toolCallId,
          toolName: message.toolName,
          type: "tool-result",
        },
      ],
      role: "tool",
    }
  }

  return {
    content: message.content,
    role: "user",
  }
}

function assistantContent(
  message: Extract<ModelMessage, { role: "assistant" }>
) {
  const text = message.content ?? ""
  const toolCalls = message.toolCalls?.map((toolCall) => ({
    input: toolCall.args,
    toolCallId: toolCall.id,
    toolName: toolCall.name,
    type: "tool-call" as const,
  }))

  return toolCalls === undefined || toolCalls.length === 0
    ? text
    : [...(text === "" ? [] : [{ text, type: "text" as const }]), ...toolCalls]
}

function toAiTools(tools: ModelTool[]): ToolSet {
  return Object.fromEntries(
    tools.map((modelTool) => [
      modelTool.name,
      tool({
        description: modelTool.description,
        inputSchema: jsonSchema(modelTool.inputSchema),
      }),
    ])
  )
}

function readToolCall(toolCall: {
  input: unknown
  invalid?: boolean
  toolCallId: string
  toolName: string
}): ModelToolCall[] {
  if (toolCall.invalid === true) {
    return []
  }

  return [
    {
      args: readToolInput(toolCall.input),
      id: toolCall.toolCallId,
      name: toolCall.toolName,
    },
  ]
}

function readToolInput(value: unknown) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? toJsonObject(value)
    : {}
}
