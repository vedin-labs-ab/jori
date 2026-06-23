import { Liquid } from "liquidjs"
import { promptTemplates } from "./generated"

const liquid = new Liquid({
  strictFilters: true,
  strictVariables: true,
  templates: promptTemplates,
})

export function renderPromptTemplate(
  template: string,
  values: Record<string, unknown>
): string {
  return normalizePromptWhitespace(liquid.parseAndRenderSync(template, values))
}

function normalizePromptWhitespace(value: string) {
  const lines = value.trim().split("\n")
  const normalized: string[] = []
  let blankLines = 0
  let inFence = false

  for (const line of lines) {
    if (line.startsWith("```")) {
      inFence = !inFence
      blankLines = 0
      normalized.push(line)
      continue
    }

    if (!inFence && line.trim() === "") {
      blankLines += 1

      if (blankLines <= 1) {
        normalized.push("")
      }

      continue
    }

    blankLines = 0
    normalized.push(line)
  }

  return normalized.join("\n")
}
