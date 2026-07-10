import { Label } from "@/components/ui/label"
import { type AutomationPolicyPermissions } from "../../access/policy"
import { type AutomationFormValues } from "../../types"
import { AutomationInstructionsField } from "../instructions"
import { automationInstructionMarkerErrors } from "../save/marker"
import { FieldHelp } from "./help"

export function AutomationInstructionsSection({
  error,
  onBlur,
  onValueChange,
  permissions,
  policyKey,
  values,
}: {
  error: string | undefined
  onBlur: () => void
  onValueChange: (
    instructions: string,
    surfaces: AutomationFormValues["surfaces"]
  ) => void
  permissions?: AutomationPolicyPermissions
  policyKey: string
  values: AutomationFormValues
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-1.5">
        <Label htmlFor="automation-description">Instructions</Label>
        <InstructionsHelp />
      </div>
      <AutomationInstructionsField
        error={error}
        id="automation-description"
        value={values.instructions}
        onBlur={onBlur}
        onValueChange={(next) => onValueChange(next.description, next.surfaces)}
        permissions={permissions}
        placeholder="Summarize GitHub changes and post them to Slack."
        policyKey={policyKey}
        showAccessError={isAccessMarkerError(error)}
        surfaces={values.surfaces}
      />
    </div>
  )
}

function InstructionsHelp() {
  return (
    <FieldHelp label="Instructions help">
      <p>Write the work Milo should do.</p>
      <p>Mention integrations like GitHub, Slack, Linear, or Gmail.</p>
      <p>Choose tools from each badge.</p>
    </FieldHelp>
  )
}

function isAccessMarkerError(error: string | undefined) {
  return (
    error === automationInstructionMarkerErrors.incompleteAccess ||
    error === automationInstructionMarkerErrors.unavailableAccess
  )
}
