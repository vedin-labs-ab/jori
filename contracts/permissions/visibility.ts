import { type Integration, isUserScopedIntegration } from "../integrations"

/**
 * Who may see a material (table, store, file, automation) or a folder.
 * Visibility gates reading; writing additionally requires organization
 * membership, so "public" never grants anonymous writes. Folders cascade:
 * a viewer must be allowed by a material's own visibility and by every
 * ancestor folder's, while owners always see what they own.
 */
export type Visibility =
  | { mode: "private" }
  | { mode: "people"; personIds: string[] }
  | { mode: "teams"; teamIds: string[] }
  | { mode: "organization" }
  | { mode: "public" }

export type VisibilityMode = Visibility["mode"]

export const visibilityModes = [
  "private",
  "people",
  "teams",
  "organization",
  "public",
] as const satisfies readonly VisibilityMode[]

export const visibilityModeLabels: Record<VisibilityMode, string> = {
  private: "Only me",
  people: "Specific people",
  teams: "Specific teams",
  organization: "Everyone in the organization",
  public: "Public",
}

/** Short audience name for badges and tooltips. */
export const visibilityModeMarks: Record<VisibilityMode, string> = {
  private: "Only me",
  people: "Specific people",
  teams: "Specific teams",
  organization: "Organization",
  public: "Public",
}

export const organizationVisibility: Visibility = { mode: "organization" }
export const privateVisibility: Visibility = { mode: "private" }

/**
 * Sensible default: anything touching a person's own tools (or nothing at
 * all) stays theirs alone; only pure workspace-tool work defaults to the
 * whole organization.
 */
export function defaultVisibilityForIntegrations(
  integrations: readonly Integration[]
): Visibility {
  if (integrations.length === 0 || integrations.some(isUserScopedIntegration)) {
    return privateVisibility
  }

  return organizationVisibility
}

/** An empty grant list grants nobody beyond the owner; normalizing it to
 *  private keeps stored visibility honest about that. */
export function normalizeVisibility(visibility: Visibility): Visibility {
  if (visibility.mode === "people") {
    const personIds = [...new Set(visibility.personIds)]

    return personIds.length === 0
      ? privateVisibility
      : { mode: "people", personIds }
  }

  if (visibility.mode === "teams") {
    const teamIds = [...new Set(visibility.teamIds)]

    return teamIds.length === 0 ? privateVisibility : { mode: "teams", teamIds }
  }

  return visibility
}
