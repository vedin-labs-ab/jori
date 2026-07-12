import { type ToolPermission } from "../../permissions/types"
import {
  type AutomationSurfaceFormValue,
  type AutomationSurfaceIntegration,
  automationSurfaceIntegrations,
  getAutomationSurfaceLabel,
} from "./catalog"
import { getIntegrationSuggestionScore, normalizeFuzzyAlias } from "./fuzzy"
import {
  type AutomationMentionKind,
  automationMentionSigils,
  canStartMention,
  sigilKind,
} from "./scan"
import { type AutomationToolAccess, resolveAutomationToolAccess } from "./tools"

const maxSuggestions = 6

type AutomationMentionSuggestionBase = {
  label: string
}

type AutomationStaticSuggestion = AutomationMentionSuggestionBase & {
  access?: never
  disabled?: never
}

export type AutomationMentionSuggestion =
  | (AutomationStaticSuggestion & {
      id: AutomationSurfaceIntegration
      kind: "integration"
      surface: AutomationSurfaceIntegration
    })
  | (AutomationStaticSuggestion & {
      id: string
      kind: "skill"
      surface?: never
    })
  | (AutomationMentionSuggestionBase & {
      access: AutomationToolAccess
      disabled: boolean
      id: string
      kind: "tool"
      surface: ToolPermission["surface"]
    })

export type AutomationMentionSources = {
  integrations?: readonly AutomationSurfaceIntegration[]
  permissions: ToolPermission[] | null | undefined
  skills: readonly string[]
  surfaces?: readonly AutomationSurfaceFormValue[]
  webSearch?: boolean
}

export type ActiveAutomationMention = {
  end: number
  kind: AutomationMentionKind
  query: string
  start: number
}

/** The canonical text a mention serializes to inside instructions. */
export function automationMentionText(kind: AutomationMentionKind, id: string) {
  const name =
    kind === "integration"
      ? getAutomationSurfaceLabel(id as AutomationSurfaceIntegration)
      : id

  return `${automationMentionSigils[kind]}${name}`
}

/** The sigil-started token the cursor is inside, if any. */
export function findActiveAutomationMention(
  text: string,
  cursor: number
): ActiveAutomationMention | null {
  if (cursor < 0 || cursor > text.length) {
    return null
  }

  for (let start = cursor - 1; start >= 0; start -= 1) {
    const kind = sigilKind(text[start])

    if (kind !== null) {
      return activeMentionAt(text, cursor, start, kind)
    }

    if (!/[a-z0-9_-]/i.test(text[start])) {
      return null
    }
  }

  return null
}

function activeMentionAt(
  text: string,
  cursor: number,
  start: number,
  kind: AutomationMentionKind
): ActiveAutomationMention | null {
  if (!canStartMention(kind, text, start)) {
    return null
  }

  const query = text.slice(start + 1, cursor)

  if (query.length > 32 || /[^a-z0-9_-]/i.test(query)) {
    return null
  }

  return { end: cursor, kind, query, start }
}

export function getAutomationMentionSuggestions(
  active: Pick<ActiveAutomationMention, "kind" | "query">,
  sources: AutomationMentionSources
): AutomationMentionSuggestion[] {
  if (active.kind === "integration") {
    return getIntegrationSuggestions(active.query, sources.integrations)
  }

  if (active.kind === "skill") {
    return rankByName(
      active.query,
      sources.skills.map((name) => ({ id: name, kind: "skill", label: name }))
    )
  }

  return rankByName(active.query, toolSuggestions(active.query, sources))
}

function getIntegrationSuggestions(
  query: string,
  integrations: readonly AutomationSurfaceIntegration[] | undefined
): AutomationMentionSuggestion[] {
  const normalizedQuery = normalizeFuzzyAlias(query)

  return automationSurfaceIntegrations
    .filter(
      (item) =>
        integrations === undefined || integrations.includes(item.integration)
    )
    .map((item) => ({
      label: item.label,
      id: item.integration,
      score: getIntegrationSuggestionScore(normalizedQuery, item),
    }))
    .filter((item) => item.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score || left.label.localeCompare(right.label)
    )
    .slice(0, maxSuggestions)
    .map(({ label, id }) => ({
      id,
      kind: "integration" as const,
      label,
      surface: id,
    }))
}

function toolSuggestions(
  query: string,
  sources: AutomationMentionSources
): AutomationMentionSuggestion[] {
  const { permissions } = sources

  if (!Array.isArray(permissions)) {
    return []
  }

  return permissions
    .map((permission) => toolSuggestion(permission, sources))
    .filter((suggestion) => !suggestion.disabled || query !== "")
}

function toolSuggestion(
  permission: ToolPermission,
  sources: AutomationMentionSources
): AutomationMentionSuggestion {
  const access = resolveAutomationToolAccess({
    permission,
    surfaces: sources.surfaces,
    webSearch: sources.webSearch,
  })

  return {
    access,
    disabled: access.kind === "unavailable",
    id: permission.tool,
    kind: "tool",
    label: permission.tool,
    surface: permission.surface,
  }
}

/** Prefix matches first, then substring matches, alphabetical within each. */
function rankByName(
  query: string,
  items: AutomationMentionSuggestion[]
): AutomationMentionSuggestion[] {
  const normalizedQuery = normalizeFuzzyAlias(query)
  const scored = items.flatMap((item) => {
    const name = normalizeFuzzyAlias(item.label)

    if (normalizedQuery === "" || name.startsWith(normalizedQuery)) {
      return [{ item, score: 2 }]
    }

    return name.includes(normalizedQuery) ? [{ item, score: 1 }] : []
  })

  return scored
    .sort(
      (left, right) =>
        right.score - left.score ||
        Number(Boolean(left.item.disabled)) -
          Number(Boolean(right.item.disabled)) ||
        left.item.label.localeCompare(right.item.label)
    )
    .slice(0, maxSuggestions)
    .map((entry) => entry.item)
}
