import { defaultVisibilityForIntegrations } from "@contracts/visibility"
import { derivedScope } from "@/shared/console/jobs/access"
import {
  emptyJobForm,
  type Job,
  type JobFormValues,
} from "@/shared/console/jobs/types"
import { localTimezone } from "@/shared/console/time"
import { triggerFormValues } from "./trigger"

/** The form's read direction. Deliberately free of the markdown codec, so
 *  pages can open the editor host without loading the editor itself. A
 *  new job starts from the web-search choice its host remembers. */
export function jobFormValues(
  job: Job | undefined,
  defaults: Pick<JobFormValues, "webSearch"> = emptyJobForm
): JobFormValues {
  if (job === undefined) {
    const values = {
      ...emptyJobForm,
      timezone: localTimezone(),
      webSearch: defaults.webSearch,
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
