import { createSearchClient } from "../../../search"
import { normalizeWebFetchInput, normalizeWebSearchInput } from "./input"
import { normalizeWebResponse } from "./output"

export async function callWebTool(tool: string, args: Record<string, unknown>) {
  if (tool === "web_search") {
    return await runWebTool(tool, () => searchWeb(args))
  }

  if (tool === "web_fetch") {
    return await runWebTool(tool, () => fetchWeb(args))
  }

  throw new Error(`Unknown web tool: ${tool}`)
}

async function searchWeb(args: Record<string, unknown>) {
  const input = normalizeWebSearchInput(args)
  const response = await createSearchClient().search(input)

  return normalizeWebResponse(response, {
    maxCharacters: input.maxCharacters,
    operation: "search",
    requestedResults: input.limit,
  })
}

async function fetchWeb(args: Record<string, unknown>) {
  const input = normalizeWebFetchInput(args)
  const response = await createSearchClient().fetch(input)

  return normalizeWebResponse(response, {
    maxCharacters: input.maxCharacters,
    operation: "contents",
    requestedResults: Number.POSITIVE_INFINITY,
  })
}

async function runWebTool(
  tool: string,
  operation: () => Promise<unknown>
): Promise<unknown> {
  try {
    return await operation()
  } catch (error) {
    throw new Error(formatWebToolError(tool, error))
  }
}

function formatWebToolError(tool: string, error: unknown) {
  return error instanceof Error
    ? `${tool} failed: ${error.message}`
    : `${tool} failed`
}
