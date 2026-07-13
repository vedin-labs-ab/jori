import { Label } from "@/components/ui/label"
import { type AutomationPolicyPermissions } from "../../access/policy"
import { type AutomationFormValues } from "../../types"
import { AutomationInstructionsField } from "../instructions/field"
import { isAutomationToolReferenceError } from "../save/instructions"
import { automationInstructionMarkerErrors } from "../save/marker"
import { FieldHelp } from "./help"

export function AutomationInstructionsSection({
  additionalSurfaces,
  error,
  onBlur,
  onWebSearchChange,
  onValueChange,
  permissions,
  policyKey,
  skills,
  values,
}: {
  additionalSurfaces: AutomationFormValues["surfaces"]
  error: string | undefined
  onBlur: () => void
  onWebSearchChange: (enabled: boolean) => void
  onValueChange: (
    instructions: string,
    surfaces: AutomationFormValues["surfaces"]
  ) => void
  permissions?: AutomationPolicyPermissions
  policyKey: string
  skills: readonly string[]
  values: AutomationFormValues
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-1.5">
        <Label htmlFor="automation-description">Instructions</Label>
        <InstructionsHelp />
      </div>
      <AutomationInstructionsField
        additionalSurfaces={additionalSurfaces}
        error={error}
        id="automation-description"
        value={values.instructions}
        onBlur={onBlur}
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
      <p>Write the work Milo should do.</p>
      <p>Mention integrations with @, skills with /, and tools with #.</p>
      <p>Choose tools from each integration badge.</p>
    </FieldHelp>
  )
}

function isAccessMarkerError(error: string | undefined) {
  return (
    error === automationInstructionMarkerErrors.incompleteAccess ||
    error === automationInstructionMarkerErrors.unavailableAccess ||
    isAutomationToolReferenceError(error)
  )
}
