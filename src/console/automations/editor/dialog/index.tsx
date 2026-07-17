import { useQuery } from "convex/react"
import { Loader2 } from "lucide-react"
import { useEffect, useMemo } from "react"
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
import { getAutomationScopeConflict } from "../../access"
import { type AutomationPolicyPermissions } from "../../access/policy"
import { type Automation, type AutomationFormValues } from "../../types"
import {
  readAutomationInstructionsError,
  readAutomationNameError,
} from "../errors"
import { readAdditionalAutomationSurfaces } from "../instructions/document"
import { writeAutomationWebSearchPreference } from "../preferences"
import { AccessFields } from "./access"
import { AutomationArtifactSection } from "./artifact"
import { AutomationContextSection } from "./context"
import { AutomationInstructionsSection } from "./instructions"
import { AutomationNameField } from "./name"
import { ScopeField } from "./scope"
import { AutomationTiming } from "./timing"

type AutomationDialogProps = {
  error: string | undefined
  isOpen: boolean
  isSaving: boolean
  onOpenChange: (isOpen: boolean) => void
  onReady?: () => void
  onSave: () => void
  onValuesChange: (values: AutomationFormValues) => void
  permissions?: AutomationPolicyPermissions
  policyKey: string
  automation: Automation | undefined
  tenantId: string
  values: AutomationFormValues
}

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
}: AutomationDialogProps) {
  // biome-ignore lint/correctness/useExhaustiveDependencies: fire once on mount
  useEffect(() => {
    onReady?.()
  }, [])

  const actions = createDialogActions(values, onValuesChange)
  const skillList = useQuery(api.skills.catalog.list, { tenantId })
  const skills = useMemo(
    () =>
      skillList !== undefined &&
      !Array.isArray(skillList) &&
      skillList.status === "ready"
        ? skillList.skills.map((skill) => skill.name)
        : [],
    [skillList]
  )
  const scopeConflict = getAutomationScopeConflict(
    values.scope,
    values.surfaces
  )
  const instructionsError =
    scopeConflict?.message ??
    readAutomationInstructionsError(error, values.instructions)
  const nameError = readAutomationNameError(error, values.name)
  const additionalSurfaces = useMemo(
    () =>
      readAdditionalAutomationSurfaces({
        description: values.instructions,
        surfaces: values.surfaces,
      }),
    [values.instructions, values.surfaces]
  )

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

        <AutomationDialogFields
          actions={actions}
          additionalSurfaces={additionalSurfaces}
          automation={automation}
          instructionsError={instructionsError}
          nameError={nameError}
          onValuesChange={onValuesChange}
          permissions={permissions}
          policyKey={policyKey}
          skills={skills}
          tenantId={tenantId}
          values={values}
        />

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

type DialogFieldsProps = {
  actions: ReturnType<typeof createDialogActions>
  additionalSurfaces: AutomationFormValues["surfaces"]
  automation: Automation | undefined
  instructionsError: string | undefined
  nameError: string | undefined
  onValuesChange: (values: AutomationFormValues) => void
  permissions: AutomationPolicyPermissions
  policyKey: string
  skills: string[]
  tenantId: string
  values: AutomationFormValues
}

function AutomationDialogFields(props: DialogFieldsProps) {
  return (
    <div className="grid gap-4">
      <AutomationNameField
        error={props.nameError}
        onValueChange={props.actions.updateName}
        value={props.values.name}
      />
      <ScopeField
        onValueChange={props.actions.updateScope}
        value={props.values.scope}
      />
      <AutomationContextSection scope={props.values.scope} />
      <AutomationArtifactSection
        tenantId={props.tenantId}
        values={props.values}
      />
      <AutomationInstructionsSection
        additionalSurfaces={props.additionalSurfaces}
        error={props.instructionsError}
        onBlur={ignoreBlur}
        onWebSearchChange={props.actions.updateWebSearch}
        onValueChange={props.actions.updateInstructions}
        permissions={props.permissions}
        policyKey={props.policyKey}
        skills={props.skills}
        values={props.values}
      />
      <AccessFields
        additionalSurfaces={props.additionalSurfaces}
        onAdditionalSurfaceChange={props.actions.updateAdditionalSurface}
        onAdditionalSurfaceRemove={props.actions.removeAdditionalSurface}
        onWebSearchChange={props.actions.updateWebSearch}
        permissions={props.permissions}
        scope={props.values.scope}
        webSearch={props.values.webSearch}
      />
      <AutomationTiming
        tenantId={props.tenantId}
        showRunPreview={props.automation !== undefined}
        onValuesChange={props.onValuesChange}
        values={props.values}
      />
    </div>
  )
}

function createDialogActions(
  values: AutomationFormValues,
  onValuesChange: (values: AutomationFormValues) => void
) {
  const updateValues = (updates: Partial<AutomationFormValues>) => {
    onValuesChange({ ...values, ...updates })
  }

  return {
    removeAdditionalSurface: (
      integration: AutomationFormValues["surfaces"][number]["integration"]
    ) =>
      updateValues({
        surfaces: values.surfaces.filter(
          (surface) => surface.integration !== integration
        ),
      }),
    updateAdditionalSurface: (
      nextSurface: AutomationFormValues["surfaces"][number]
    ) =>
      updateValues({
        surfaces: values.surfaces.map((surface) =>
          surface.integration === nextSurface.integration
            ? nextSurface
            : surface
        ),
      }),
    updateInstructions: (
      instructions: string,
      surfaces: AutomationFormValues["surfaces"]
    ) => updateValues({ instructions, surfaces }),
    updateName: (name: string) => updateValues({ name }),
    updateScope: (scope: AutomationFormValues["scope"]) =>
      updateValues({ scope }),
    updateWebSearch: (webSearch: boolean) => {
      writeAutomationWebSearchPreference(webSearch)
      updateValues({ webSearch })
    },
  }
}

function ignoreBlur() {
  return undefined
}
