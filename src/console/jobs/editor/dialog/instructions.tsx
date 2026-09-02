import { Label } from "@/components/ui/label"
import { type JobPolicyPermissions } from "@/shared/console/jobs/access/policy"
import {
  isJobToolReferenceError,
  jobInstructionMarkerErrors,
} from "@/shared/console/jobs/editor/errors"
import { JobInstructionsField } from "@/shared/console/jobs/editor/instructions/field"
import { type JobFormValues } from "@/shared/console/jobs/types"
import { FieldHelp } from "@/shared/field"

export function JobInstructionsSection({
  additionalSurfaces,
  error,
  onWebSearchChange,
  onValueChange,
  permissions,
  policyKey,
  skills,
  values,
}: {
  additionalSurfaces: JobFormValues["surfaces"]
  error: string | undefined
  onWebSearchChange: (enabled: boolean) => void
  onValueChange: (
    instructions: string,
    surfaces: JobFormValues["surfaces"]
  ) => void
  permissions?: JobPolicyPermissions
  policyKey: string
  skills: readonly string[]
  values: JobFormValues
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-1.5">
        <Label htmlFor="job-description">Instructions</Label>
        <InstructionsHelp />
      </div>
      <JobInstructionsField
        additionalSurfaces={additionalSurfaces}
        error={error}
        id="job-description"
        value={values.instructions}
        onWebSearchChange={onWebSearchChange}
        onValueChange={(next) => onValueChange(next.description, next.surfaces)}
        permissions={permissions}
        placeholder="Summarize @GitHub changes and post them to @Slack."
        policyKey={policyKey}
        showAccessError={isAccessMarkerError(error)}
        scope={values.scope}
        skills={skills}
        surfaces={values.surfaces}
        webSearch={values.webSearch}
      />
    </div>
  )
}

function InstructionsHelp() {
  return (
    <FieldHelp label="Instructions help">
      <p>Write the work Jori should do.</p>
      <p>Mention integrations with @, skills with /, and tools with #.</p>
      <p>Choose tools from each integration badge.</p>
    </FieldHelp>
  )
}

function isAccessMarkerError(error: string | undefined) {
  return (
    error === jobInstructionMarkerErrors.incompleteAccess ||
    error === jobInstructionMarkerErrors.unavailableAccess ||
    isJobToolReferenceError(error)
  )
}
