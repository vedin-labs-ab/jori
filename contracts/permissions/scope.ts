import { type Integration, isUserScopedIntegration } from "../integrations"

/**
 * Audience of a long-lived entity (automation, playbook, artifact, run):
 * personal entities are visible to and managed by their owner only;
 * organization entities are visible to and managed by every member.
 * Execution identity is orthogonal: runs always use the owner's tools.
 */
export type Scope = "personal" | "organization"

export const scopeValues = ["personal", "organization"] as const

export const scopeLabels: Record<Scope, string> = {
  personal: "Personal",
  organization: "Organization",
}

/**
 * Sensible default: anything touching the owner's own tools (or nothing at
 * all) stays personal; only pure workspace-tool work defaults to the
 * organization.
 */
export function defaultScopeForIntegrations(
  integrations: readonly Integration[]
): Scope {
  if (integrations.length === 0 || integrations.some(isUserScopedIntegration)) {
    return "personal"
  }

  return "organization"
}
