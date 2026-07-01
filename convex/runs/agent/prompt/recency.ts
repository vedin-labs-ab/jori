import { promptTemplates } from "../../../../prompts/generated"
import { renderPromptTemplate } from "../../../../prompts/render"
import {
  recencyConversationLimit,
  recencyPromptCharacterLimit,
  recencySummaryCharacterLimit,
} from "../../../conversations/limits"
import { type RecentActivity } from "../../../conversations/recency"
import { integrationLabels } from "../../../shared/integrations"
import { type AgentRuntimeInput } from "../input"

type PromptRecentActivity = {
  age: string
  summary: string
  surface: string
}

export function createRecentActivityInstructions(input: AgentRuntimeInput) {
  if (input.type !== "message") {
    return ""
  }

  const items = fitPromptItems(input.recency)

  return items.length === 0 ? "" : renderRecentActivity(items)
}

function fitPromptItems(activity: RecentActivity[]) {
  const items: PromptRecentActivity[] = []

  for (const entry of activity.slice(0, recencyConversationLimit)) {
    const item = formatPromptItem(entry)
    const next = [...items, item]

    if (renderRecentActivity(next).length > recencyPromptCharacterLimit) {
      return items
    }

    items.push(item)
  }

  return items
}

function renderRecentActivity(items: PromptRecentActivity[]) {
  return renderPromptTemplate(promptTemplates["conversation/recency"], {
    recency: { items },
  }).trim()
}

function formatPromptItem(entry: RecentActivity): PromptRecentActivity {
  return {
    age: formatAge(entry.ageMs),
    summary: truncate(normalizeSummary(entry.summary)),
    surface: integrationLabels[entry.integration],
  }
}

function normalizeSummary(summary: string) {
  return summary.replace(/\s+/g, " ").trim()
}

function truncate(summary: string) {
  if (summary.length <= recencySummaryCharacterLimit) {
    return summary
  }

  return `${summary.slice(0, recencySummaryCharacterLimit - 3).trimEnd()}...`
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
