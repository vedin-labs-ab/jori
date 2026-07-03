import { promptTemplates } from "../../../prompts/generated"
import { renderPromptTemplate } from "../../../prompts/render"
import { integrationLabels } from "../../shared/integrations"
import { type RecencyEntry } from "./load"

export function renderRecentActivity(args: {
  entries: RecencyEntry[]
  name: string
}) {
  return renderPromptTemplate(promptTemplates["conversation/recency"], {
    recency: {
      items: args.entries.map(recencyItem),
      name: args.name,
    },
  }).trim()
}

function recencyItem(entry: RecencyEntry) {
  return {
    age: entry.kind === "summary" ? formatAge(entry.ageMs) : null,
    identifiers:
      entry.identifiers.length === 0 ? null : entry.identifiers.join(", "),
    summary: entry.kind === "summary" ? entry.summary : null,
    surface: integrationLabels[entry.integration],
  }
}

function formatAge(ageMs: number) {
  const minutes = Math.floor(ageMs / 60_000)

  if (minutes < 1) {
    return "just now"
  }

  if (minutes < 60) {
    return unit(minutes, "minute")
  }

  const hours = Math.floor(minutes / 60)

  if (hours < 24) {
    return unit(hours, "hour")
  }

  return unit(Math.floor(hours / 24), "day")
}

function unit(value: number, label: string) {
  return value === 1 ? `1 ${label} ago` : `${value} ${label}s ago`
}
