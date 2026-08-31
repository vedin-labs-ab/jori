import { isRecord } from "../../contracts/json"
import { type OpenRouterChatMessage, sendOpenRouterChat } from "./openrouter"

// One structured-output call with a strict JSON schema. Model and reasoning
// are the caller's decision: cheap mechanical work runs low, judgment calls
// run high. Every structured call in the codebase goes through here so the
// request shape and response handling live in a single place.
export async function requestStructured(options: {
  model: string
  reasoning: "low" | "medium" | "high"
  schemaName: string
  schema: Record<string, unknown>
  system: string
  user: string
  maxTokens: number
}): Promise<Record<string, unknown>> {
  const messages: OpenRouterChatMessage[] = [
    { role: "system", content: options.system },
    { role: "user", content: options.user },
  ]

  const response = await sendOpenRouterChat({
    model: options.model,
    maxTokens: options.maxTokens,
    provider: { requireParameters: true, sort: "latency" },
    reasoning: { effort: options.reasoning },
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
    throw new Error("The structured model returned no choices.")
  }

  if (choice.finishReason === "length") {
    throw new Error("The structured model response was truncated.")
  }

  const content = choice.message.content

  if (typeof content !== "string" || content.trim() === "") {
    throw new Error("The structured model returned empty content.")
  }

  return content
}

function parseJson(text: string): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(text)

    return isRecord(value) ? value : {}
  } catch {
    throw new Error("The structured model returned invalid JSON.")
  }
}
