import { type ToolPermission } from "../../permissions/types"
import {
  getJobSurfaceLabel,
  type JobSurfaceFormValue,
  type JobSurfaceIntegration,
  jobSurfaceIntegrations,
} from "./catalog"
import { getIntegrationSuggestionScore, normalizeFuzzyAlias } from "./fuzzy"
import {
  canStartMention,
  type JobMentionKind,
  jobMentionSigils,
  sigilKind,
} from "./scan"
import { type JobToolAccess, resolveJobToolAccess } from "./tools"

const maxSuggestions = 6
const maxJobMentionQueryLength = 32
export const maxActiveJobMentionLength = maxJobMentionQueryLength + 2

type JobMentionSuggestionBase = {
  label: string
}

type JobStaticSuggestion = JobMentionSuggestionBase & {
  access?: never
  disabled?: never
}

export type JobMentionSuggestion =
  | (JobStaticSuggestion & {
      id: JobSurfaceIntegration
      kind: "integration"
      surface: JobSurfaceIntegration
    })
  | (JobStaticSuggestion & {
      id: string
      kind: "skill"
      surface?: never
    })
  | (JobMentionSuggestionBase & {
      access: JobToolAccess
      disabled: boolean
      id: string
      kind: "tool"
      surface: ToolPermission["surface"]
    })

export type JobMentionSources = {
  integrations?: readonly JobSurfaceIntegration[]
  permissions: ToolPermission[] | null | undefined
  skills: readonly string[]
  surfaces?: readonly JobSurfaceFormValue[]
  webSearch?: boolean
}

export type ActiveJobMention = {
  end: number
  kind: JobMentionKind
  query: string
  start: number
}

/** The canonical text a mention serializes to inside instructions. */
export function jobMentionText(kind: JobMentionKind, id: string) {
  const name =
    kind === "integration"
      ? getJobSurfaceLabel(id as JobSurfaceIntegration)
      : id

  return `${jobMentionSigils[kind]}${name}`
}

/** The sigil-started token the cursor is inside, if any. */
export function findActiveJobMention(
  text: string,
  cursor: number
): ActiveJobMention | null {
  if (cursor < 0 || cursor > text.length) {
    return null
  }

  const earliestStart = Math.max(0, cursor - maxActiveJobMentionLength)

  for (let start = cursor - 1; start >= earliestStart; start -= 1) {
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
  kind: JobMentionKind
): ActiveJobMention | null {
  if (!canStartMention(kind, text, start)) {
    return null
  }

  const query = text.slice(start + 1, cursor)

  if (query.length > maxJobMentionQueryLength || /[^a-z0-9_-]/i.test(query)) {
    return null
  }

  return { end: cursor, kind, query, start }
}

export function getJobMentionSuggestions(
  active: Pick<ActiveJobMention, "kind" | "query">,
  sources: JobMentionSources
): JobMentionSuggestion[] {
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
  integrations: readonly JobSurfaceIntegration[] | undefined
): JobMentionSuggestion[] {
  const normalizedQuery = normalizeFuzzyAlias(query)

  return jobSurfaceIntegrations
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
  sources: JobMentionSources
): JobMentionSuggestion[] {
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
  sources: JobMentionSources
): JobMentionSuggestion {
  const access = resolveJobToolAccess({
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
  items: JobMentionSuggestion[]
): JobMentionSuggestion[] {
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
