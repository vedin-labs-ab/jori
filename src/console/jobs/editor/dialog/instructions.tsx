import { Label } from "@/components/ui/label"
import { FieldHelp } from "@/shared/field"
import { type JobPolicyPermissions } from "../../access/policy"
import { type JobFormValues } from "../../types"
import { isJobToolReferenceError } from "../errors"
import { JobInstructionsField } from "../instructions/field"
import { jobInstructionMarkerErrors } from "../save/marker"

export function JobInstructionsSection({
  additionalSurfaces,
  error,
  onWebSearchChange,
  onValueChange,
  permissions,
  policyKey,
  skills,
  organizationId,
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
  organizationId: string
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
        organizationId={organizationId}
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
