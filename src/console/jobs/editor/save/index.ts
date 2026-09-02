import {
  defaultVisibilityForIntegrations,
  type Visibility,
} from "@contracts/visibility"
import { localTimezone } from "../../../shared/time"
import { emptyJobForm, type Job, type JobFormValues } from "../../types"
import { readJobPreferences } from "../preferences"
import { triggerFormValues } from "./trigger"

/** The form's read direction. Deliberately free of the markdown codec, so
 *  pages can open the editor host without loading the editor itself. */
export function jobFormValues(job: Job | undefined): JobFormValues {
  if (job === undefined) {
    const values = {
      ...emptyJobForm,
      timezone: localTimezone(),
      ...readJobPreferences(),
    }

    const visibility = defaultVisibilityForIntegrations(
      values.surfaces.map((surface) => surface.integration)
    )

    return { ...values, visibility, scope: derivedScope(visibility) }
  }

  return {
    name: job.name,
    instructions: job.instructions,
    ...triggerFormValues(job),
    visibility: job.visibility,
    scope: derivedScope(job.visibility),
    folderId: null,
    webSearch: job.access.webSearch,
    surfaces: job.access.surfaces,
  }
}

/** The execution sharing a visibility implies: private jobs run as
 *  their person, every shared mode as the organization. */
export function derivedScope(visibility: Visibility) {
  return visibility.mode === "private"
    ? ("personal" as const)
    : ("organization" as const)
}
