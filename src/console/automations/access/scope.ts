import { isUserScopedIntegration } from "@contracts/integrations"
import { type Scope } from "@contracts/permissions/scope"
import {
  type AutomationSurfaceFormValue,
  type AutomationSurfaceIntegration,
  getAutomationSurfaceLabel,
} from "./catalog"

export const automationScopeConflictMessage =
  "Organization automations can’t use personal integrations. Remove the highlighted integrations or switch to Personal."

export function isAutomationSurfaceAllowedForScope(
  scope: Scope,
  integration: AutomationSurfaceIntegration
) {
  return scope === "personal" || !isUserScopedIntegration(integration)
}

export function getAutomationScopeConflict(
  scope: Scope,
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
  scope: Scope,
  integration: AutomationSurfaceIntegration
) {
  return isAutomationSurfaceAllowedForScope(scope, integration)
    ? undefined
    : `${getAutomationSurfaceLabel(integration)} requires Personal sharing.`
}
