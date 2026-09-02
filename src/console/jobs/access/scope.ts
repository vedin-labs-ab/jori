import { isUserScopedIntegration } from "@contracts/integrations"
import {
  getJobSurfaceLabel,
  type JobSurfaceFormValue,
  type JobSurfaceIntegration,
} from "./catalog"

/** How a job executes, derived from its visibility: private runs as
 *  its person, every shared mode as the organization. Only personal
 *  execution can reach a person's own connections, which is what every rule
 *  below is about. */
export type JobScope = "personal" | "organization"

export const jobScopeConflictMessage =
  "Organization jobs can't use personal access. Remove the highlighted items or switch to Personal."

export function isJobSurfaceAllowedForScope(
  scope: JobScope,
  integration: JobSurfaceIntegration
) {
  return scope === "personal" || !isUserScopedIntegration(integration)
}

export function getJobScopeConflict(
  scope: JobScope,
  surfaces: readonly JobSurfaceFormValue[]
) {
  const integrations = surfaces
    .map((surface) => surface.integration)
    .filter((integration) => !isJobSurfaceAllowedForScope(scope, integration))

  return integrations.length === 0
    ? undefined
    : {
        integrations: [...new Set(integrations)],
        message: jobScopeConflictMessage,
      }
}

export function getJobSurfaceScopeIssue(
  scope: JobScope,
  integration: JobSurfaceIntegration
) {
  return isJobSurfaceAllowedForScope(scope, integration)
    ? undefined
    : `${getJobSurfaceLabel(integration)} requires Personal sharing.`
}
