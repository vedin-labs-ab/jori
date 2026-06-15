import { Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { type AutomationPolicyPermissions } from "../../policy"
import { type Automation, type AutomationFormValues } from "../../types"
import { createAutomationDialogActions } from "../actions"
import {
  isAutomationInstructionsError,
  isAutomationNameError,
  readAutomationInstructionsError,
  readAutomationNameError,
} from "../errors"
import { AccessFields } from "./access"
import { AutomationInstructionsSection } from "./instructions"
import { AutomationNameField } from "./name"
import { AutomationTiming } from "./timing"

export function AutomationDialog({
  error,
  isOpen,
  isSaving,
  onOpenChange,
  onSave,
  onValuesChange,
  permissions,
  policyKey,
  automation,
  tenantId,
  values,
}: {
  error: string | undefined
  isOpen: boolean
  isSaving: boolean
  onOpenChange: (isOpen: boolean) => void
  onSave: () => void
  onValuesChange: (values: AutomationFormValues) => void
  permissions?: AutomationPolicyPermissions
  policyKey: string
  automation: Automation | undefined
  tenantId: string
  values: AutomationFormValues
}) {
  const actions = createAutomationDialogActions({
    onValuesChange,
    permissions,
    values,
  })
  const instructionsError = readAutomationInstructionsError(
    error,
    values.instructions
  )
  const nameError = readAutomationNameError(error, values.name)
  const shouldShowFormError =
    error !== undefined &&
    instructionsError === undefined &&
    !isAutomationNameError(error) &&
    !isAutomationInstructionsError(error)

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (isSaving) {
          return
        }

        onOpenChange(open)
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {automation === undefined ? "New automation" : "Edit automation"}
          </DialogTitle>
          <DialogDescription>
            Tell Milo what to do, what it can access, and when to run.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <AutomationNameField
            error={nameError}
            onValueChange={actions.updateName}
            value={values.name}
          />
          <AutomationInstructionsSection
            error={instructionsError}
            onBlur={actions.normalizeDescription}
            onValueChange={actions.updateInstructions}
            permissions={permissions}
            policyKey={policyKey}
            values={values}
          />
          <AccessFields
            onWebSearchChange={actions.updateWebSearch}
            webSearch={values.webSearch}
          />
          <AutomationTiming
            tenantId={tenantId}
            showRunPreview={automation !== undefined}
            onValuesChange={onValuesChange}
            values={values}
          />
        </div>

        {shouldShowFormError ? (
          <Alert variant="destructive">
            <AlertTitle>Could not save automation</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <DialogFooter>
          <Button type="button" onClick={onSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
            {automation === undefined ? "Create automation" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
