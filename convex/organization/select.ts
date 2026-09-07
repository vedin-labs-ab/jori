import { defaultSelection } from "../../contracts/models/selection"
import { promptTemplates } from "../../prompts/generated"
import { renderPromptTemplate } from "../../prompts/render"
import { requestStructured } from "../model/structured"
import { normalizeLink } from "./crawl"

const maxCandidatesConsidered = 40
const maxSelectionTokens = 600

const selectionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["urls"],
  properties: {
    urls: { type: "array", items: { type: "string" } },
  },
}

// Asks the model which candidate links to read next. Returns a subset of the
// candidates, capped to `limit`.
export async function selectLinks(options: {
  primaryUrl: string
  candidates: string[]
  limit: number
}): Promise<string[]> {
  if (options.candidates.length === 0 || options.limit <= 0) {
    return []
  }

  const considered = options.candidates.slice(0, maxCandidatesConsidered)
  const value = await requestStructured({
    model: defaultSelection.model,
    reasoning: "low",
    schemaName: "selected_links",
    schema: selectionSchema,
    system: renderPromptTemplate(promptTemplates["organization/selection"], {}),
    user: JSON.stringify({
      primaryUrl: options.primaryUrl,
      limit: options.limit,
      links: considered,
    }),
    maxTokens: maxSelectionTokens,
  })

  return chooseFrom(considered, value.urls, options.limit)
}

function chooseFrom(
  considered: string[],
  value: unknown,
  limit: number
): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  const byKey = new Map<string, string>()
  for (const url of considered) {
    const key = normalizeLink(url)
    if (key !== null) {
      byKey.set(key, url)
    }
  }

  const chosen: string[] = []
  const used = new Set<string>()

  for (const item of value) {
    if (typeof item !== "string") {
      continue
    }

    const key = normalizeLink(item)
    const match = key === null ? undefined : byKey.get(key)

    if (key === null || match === undefined || used.has(key)) {
      continue
    }

    used.add(key)
    chosen.push(match)

    if (chosen.length >= limit) {
      break
    }
  }

  return chosen
}
