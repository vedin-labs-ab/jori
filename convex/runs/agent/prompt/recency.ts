import { promptTemplates } from "../../../../prompts/generated"
import { renderPromptTemplate } from "../../../../prompts/render"
import { recencyConversationLimit } from "../../../conversations/limits"
import { type RecentActivity } from "../../../conversations/recency"
import { integrationLabels } from "../../../shared/integrations"
import { type AgentRuntimeInput } from "../input"

type PromptRecentActivity = {
  age: string
  identifiers: string | null
  summarizedAt: string
  summary: string
  surface: string
}

export function createRecentActivityInstructions(input: AgentRuntimeInput) {
  if (input.type !== "message") {
    return ""
  }

  const items = input.recency
    .slice(0, recencyConversationLimit)
    .map(formatPromptItem)

  return items.length === 0 ? "" : renderRecentActivity(items)
}

function renderRecentActivity(items: PromptRecentActivity[]) {
  return renderPromptTemplate(promptTemplates["conversation/recency"], {
    recency: { items },
  }).trim()
}

function formatPromptItem(entry: RecentActivity): PromptRecentActivity {
  return {
    age: formatAge(entry.ageMs),
    identifiers: formatIdentifiers(entry.identifiers),
    summarizedAt: new Date(entry.summarizedAt).toISOString(),
    summary: entry.summary,
    surface: integrationLabels[entry.integration],
  }
}

function formatIdentifiers(identifiers: string[]) {
  return identifiers.length === 0 ? null : identifiers.join(", ")
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
