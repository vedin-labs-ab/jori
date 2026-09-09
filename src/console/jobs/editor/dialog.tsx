import { lazy } from "react"
import { type JobPolicyPermissions } from "@/shared/console/jobs/access/policy"
import { JobEditorDialog } from "@/shared/console/jobs/editor/dialog"
import { type Job, type JobFormValues } from "@/shared/console/jobs/types"
import { FolderField } from "../../folders/field"
import {
  usePeopleOptions,
  useTeamOptions,
} from "../../shared/visibility/options"
import { useSkillNames } from "../skills"
import { writeJobWebSearchPreference } from "./preferences"
import { ToolReferenceProvider } from "./references"

// The Event tab reaches the organization's connections and option sources;
// like the editor itself, it loads only once someone opens it.
const EventFields = lazy(async () => ({
  default: (await import("./event")).EventFields,
}))

type JobDialogProps = {
  error: string | undefined
  isOpen: boolean
  isSaving: boolean
  onOpenChange: (isOpen: boolean) => void
  onSave: () => void
  onValuesChange: (values: JobFormValues) => void
  permissions?: JobPolicyPermissions
  policyKey: string
  job: Job | undefined
  organizationId: string
  values: JobFormValues
}

/** The job editor bound to an organization: its skills for `/` mentions,
 *  its people and teams for sharing, its folder tree, its connections
 *  behind the Event tab, and its tool schemas behind the pills. */
export function JobDialog({
  error,
  isOpen,
  isSaving,
  onOpenChange,
  onSave,
  onValuesChange,
  permissions,
  policyKey,
  job,
  organizationId,
  values,
}: JobDialogProps) {
  const skills = useSkillNames(organizationId)
  const people = usePeopleOptions(organizationId)
  const teams = useTeamOptions(organizationId)

  return (
    <ToolReferenceProvider organizationId={organizationId}>
      <JobEditorDialog
        error={error}
        eventFields={
          <EventFields
            organizationId={organizationId}
            onValuesChange={onValuesChange}
            values={values}
          />
        }
        folderField={(field) => (
          <FolderField {...field} organizationId={organizationId} />
        )}
        grantOptions={{ people, teams }}
        isOpen={isOpen}
        isSaving={isSaving}
        job={job}
        onOpenChange={onOpenChange}
        onSave={onSave}
        onValuesChange={(next) => {
          rememberWebSearch(values, next)
          onValuesChange(next)
        }}
        permissions={permissions}
        policyKey={policyKey}
        skills={skills}
        values={values}
      />
    </ToolReferenceProvider>
  )
}

/** The web-search choice is remembered for the next new job, whichever
 *  control changed it. */
function rememberWebSearch(previous: JobFormValues, next: JobFormValues) {
  if (next.webSearch !== previous.webSearch) {
    writeJobWebSearchPreference(next.webSearch)
  }
}
