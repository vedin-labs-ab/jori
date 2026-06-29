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
import { requireOpenRouterRuntimeConfig } from "./config"
import { beginExecutionMessage, readToolInput } from "./shared"
import {
  type ModelMessage,
  type ModelResponse,
  type ModelRuntime,
  type ModelTool,
  type ModelToolCall,
  type ModelUsage,
} from "./types"

const agentModel = "openai/gpt-5.5"
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

    if (toolCalls.length === 0) {
      return {
        content: response.text,
        usage: readModelUsage(response),
        type: "stop",
      }
    }

    return {
      content: response.text === "" ? null : response.text,
      toolCalls,
      usage: readModelUsage(response),
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

  if (promptMessages.length === 0) {
    promptMessages.push({
      content: beginExecutionMessage,
      role: "user",
    })
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

function readModelUsage(response: { usage?: unknown }): ModelUsage | undefined {
  const usage = response.usage

  if (typeof usage !== "object" || usage === null) {
    return undefined
  }

  return compactUsage({
    inputTokens: readNumber(usage, "inputTokens"),
    outputTokens: readNumber(usage, "outputTokens"),
    reasoningTokens: readNumber(usage, "reasoningTokens"),
    totalTokens: readNumber(usage, "totalTokens"),
  })
}

function compactUsage(usage: ModelUsage) {
  const entries = Object.entries(usage).filter(
    ([, value]) => value !== undefined
  )

  return entries.length === 0
    ? undefined
    : (Object.fromEntries(entries) as ModelUsage)
}

function readNumber(record: object, key: string) {
  if (!(key in record)) {
    return undefined
  }

  const value = record[key as keyof typeof record]

  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}
