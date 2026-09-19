import { type ActiveMention } from "@/shared/console/mentions/active"
import {
  maxSuggestions,
  normalizeFuzzyAlias,
  rankByName,
} from "@/shared/console/mentions/rank"
import { type ToolPermission } from "@/shared/console/tools/model"
import {
  type JobSurfaceFormValue,
  type JobSurfaceIntegration,
  jobSurfaceIntegrations,
} from "./catalog"
import { getIntegrationSuggestionScore } from "./fuzzy"
import { type JobToolAccess, resolveJobToolAccess } from "./tools"

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
}

export function getJobMentionSuggestions(
  active: Pick<ActiveMention, "kind" | "query">,
  sources: JobMentionSources
): JobMentionSuggestion[] {
  switch (active.kind) {
    case "integration":
      return getIntegrationSuggestions(active.query, sources.integrations)
    case "skill":
      return rankByName(
        active.query,
        sources.skills.map((name) => ({ id: name, kind: "skill", label: name }))
      )
    case "tool":
      return rankByName(active.query, toolSuggestions(active.query, sources))
    case "resource":
      return []
  }
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
