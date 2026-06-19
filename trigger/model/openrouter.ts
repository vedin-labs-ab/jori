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
import {
  type ModelMessage,
  type ModelResponse,
  type ModelRuntime,
  type ModelTool,
  type ModelToolCall,
} from "./types"

const defaultModel = "z-ai/glm-5.2"
const defaultReasoningEffort = "xhigh"
const agentProviderRouting = {
  require_parameters: true,
  sort: "price",
} satisfies NonNullable<OpenRouterChatSettings["provider"]>
const reasoningEfforts = new Set([
  "high",
  "low",
  "medium",
  "minimal",
  "none",
  "xhigh",
])
export type ReasoningEffort =
  | "high"
  | "low"
  | "medium"
  | "minimal"
  | "none"
  | "xhigh"

export class OpenRouterModelRuntime implements ModelRuntime {
  private readonly config = requireModelConfig()
  private readonly provider = createOpenRouter({
    apiKey: this.config.apiKey,
    appName: readEnvironmentVariable("OPENROUTER_APP_TITLE") ?? "Milo",
    appUrl:
      readEnvironmentVariable("OPENROUTER_HTTP_REFERER") ??
      readEnvironmentVariable("CONVEX_SITE_URL") ??
      readEnvironmentVariable("VITE_CONVEX_SITE_URL"),
  })

  async complete(args: {
    messages: ModelMessage[]
    tools: ModelTool[]
  }): Promise<ModelResponse> {
    const prompt = toAiPrompt(args.messages)
    const reasoningEffort = readReasoningEffort()
    const response = await generateText({
      ...prompt,
      model: this.provider.chat(
        this.config.model,
        createOpenRouterModelSettings(reasoningEffort)
      ),
      toolChoice: args.tools.length === 0 ? "none" : "auto",
      tools: toAiTools(args.tools),
    })
    const toolCalls = response.toolCalls.flatMap(readToolCall)

    if (toolCalls.length === 0) {
      return {
        content: response.text,
        type: "message",
      }
    }

    return {
      content: response.text === "" ? null : response.text,
      toolCalls,
      type: "tool_calls",
    }
  }
}

export function createOpenRouterModelSettings(
  reasoningEffort: ReasoningEffort | undefined
): OpenRouterChatSettings {
  return {
    provider: agentProviderRouting,
    ...(reasoningEffort === undefined
      ? {}
      : { reasoning: { effort: reasoningEffort } }),
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
      content: "Begin executing the current task.",
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

function readToolInput(value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {}
  }

  return value as Record<string, unknown>
}

function requireModelConfig() {
  const apiKey = readEnvironmentVariable("OPENROUTER_API_KEY")

  if (apiKey === undefined) {
    throw new Error("Missing OPENROUTER_API_KEY")
  }

  return {
    apiKey,
    model: readEnvironmentVariable("MILO_OPENROUTER_MODEL") ?? defaultModel,
  }
}

function readReasoningEffort() {
  const effort =
    readEnvironmentVariable("MILO_OPENROUTER_REASONING_EFFORT") ??
    defaultReasoningEffort

  if (!reasoningEfforts.has(effort)) {
    throw new Error(
      "MILO_OPENROUTER_REASONING_EFFORT must be high, low, medium, minimal, none, or xhigh"
    )
  }

  return effort as ReasoningEffort
}

function readEnvironmentVariable(name: string) {
  const value = process.env[name]?.trim()

  return value === "" ? undefined : value
}
