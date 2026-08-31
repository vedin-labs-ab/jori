import { isUserScopedIntegration } from "@contracts/integrations"
import {
  type AutomationSurfaceFormValue,
  type AutomationSurfaceIntegration,
  getAutomationSurfaceLabel,
} from "./catalog"

/** How an automation executes, derived from its visibility: private runs as
 *  its person, every shared mode as the organization. Only personal
 *  execution can reach a person's own connections, which is what every rule
 *  below is about. */
export type AutomationScope = "personal" | "organization"

export const automationScopeConflictMessage =
  "Organization automations can't use personal access. Remove the highlighted items or switch to Personal."

export function isAutomationSurfaceAllowedForScope(
  scope: AutomationScope,
  integration: AutomationSurfaceIntegration
) {
  return scope === "personal" || !isUserScopedIntegration(integration)
}

export function getAutomationScopeConflict(
  scope: AutomationScope,
  surfaces: readonly AutomationSurfaceFormValue[]
) {
  const integrations = surfaces
    .map((surface) => surface.integration)
    .filter(
      (integration) => !isAutomationSurfaceAllowedForScope(scope, integration)
    )

  return integrations.length === 0
    ? undefined
    : {
        integrations: [...new Set(integrations)],
        message: automationScopeConflictMessage,
      }
}

export function getAutomationSurfaceScopeIssue(
  scope: AutomationScope,
  integration: AutomationSurfaceIntegration
) {
  return isAutomationSurfaceAllowedForScope(scope, integration)
    ? undefined
    : `${getAutomationSurfaceLabel(integration)} requires Personal sharing.`
}
