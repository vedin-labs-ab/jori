import { useQuery } from "convex/react"
import { Loader2 } from "lucide-react"
import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { api } from "../../../../../convex/_generated/api"
import { type AutomationPolicyPermissions } from "../../access/policy"
import { type Automation, type AutomationFormValues } from "../../types"
import { createAutomationDialogActions } from "../actions"
import {
  readAutomationInstructionsError,
  readAutomationNameError,
} from "../errors"
import { AccessFields } from "./access"
import { AutomationInstructionsSection } from "./instructions"
import { AutomationNameField } from "./name"
import { ScopeField } from "./scope"
import { AutomationTiming } from "./timing"

export function AutomationDialog({
  error,
  isOpen,
  isSaving,
  onOpenChange,
  onReady,
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
  /** Fires once the lazily loaded dialog has actually mounted. */
  onReady?: () => void
  onSave: () => void
  onValuesChange: (values: AutomationFormValues) => void
  permissions?: AutomationPolicyPermissions
  policyKey: string
  automation: Automation | undefined
  tenantId: string
  values: AutomationFormValues
}) {
  // biome-ignore lint/correctness/useExhaustiveDependencies: fire once on mount
  useEffect(() => {
    onReady?.()
  }, [])

  const actions = createAutomationDialogActions({
    onValuesChange,
    permissions,
    values,
  })
  const skillList = useQuery(api.skills.catalog.list, { tenantId })
  const skills =
    skillList !== undefined &&
    !Array.isArray(skillList) &&
    skillList.status === "ready"
      ? skillList.skills.map((skill) => skill.name)
      : []
  const instructionsError = readAutomationInstructionsError(
    error,
    values.instructions
  )
  const nameError = readAutomationNameError(error, values.name)

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
          <ScopeField
            onValueChange={actions.updateScope}
            value={values.scope}
          />
          <AutomationInstructionsSection
            error={instructionsError}
            onBlur={actions.normalizeDescription}
            onValueChange={actions.updateInstructions}
            permissions={permissions}
            policyKey={policyKey}
            skills={skills}
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
