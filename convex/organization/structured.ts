import { type OpenRouterChatMessage, sendOpenRouterChat } from "../model"

const model = "openai/gpt-5.5"
const defaultReasoning = "low"

// One structured-output call against the discovery model. Both fact extraction
// and link selection go through here so the request shape, model choice, and
// response handling live in a single place. `reasoning` defaults to "low" for
// cheap mechanical work; raise it for calls that need real judgment.
export async function requestStructured(options: {
  schemaName: string
  schema: Record<string, unknown>
  system: string
  user: string
  maxTokens: number
  reasoning?: "low" | "medium" | "high"
}): Promise<Record<string, unknown>> {
  const messages: OpenRouterChatMessage[] = [
    { role: "system", content: options.system },
    { role: "user", content: options.user },
  ]

  const response = await sendOpenRouterChat({
    model,
    maxTokens: options.maxTokens,
    provider: { requireParameters: true, sort: "latency" },
    reasoning: { effort: options.reasoning ?? defaultReasoning },
    responseFormat: {
      type: "json_schema",
      jsonSchema: {
        name: options.schemaName,
        strict: true,
        schema: options.schema,
      },
    },
    messages,
  })

  return parseJson(readContent(response))
}

function readContent(response: Awaited<ReturnType<typeof sendOpenRouterChat>>) {
  const choice = response.choices[0]

  if (choice === undefined) {
    throw new Error("The discovery model returned no choices.")
  }

  if (choice.finishReason === "length") {
    throw new Error("The discovery model response was truncated.")
  }

  const content = choice.message.content

  if (typeof content !== "string" || content.trim() === "") {
    throw new Error("The discovery model returned empty content.")
  }

  return content
}

function parseJson(text: string): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(text)

    return typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {}
  } catch {
    throw new Error("The discovery model returned invalid JSON.")
  }
}
