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
import { FolderField } from "../../../folders/field"
import { DialogForm } from "../../../shared/materials/form"
import { VisibilityField } from "../../../shared/visibility/field"
import { getAutomationScopeConflict } from "../../access"
import { type AutomationPolicyPermissions } from "../../access/policy"
import { type Automation, type AutomationFormValues } from "../../types"
import {
  readAutomationInstructionsError,
  readAutomationNameError,
} from "../errors"
import { readAdditionalAutomationSurfaces } from "../instructions/document"
import { writeAutomationWebSearchPreference } from "../preferences"
import { derivedScope } from "../save"
import { AccessFields } from "./access"
import { AutomationContextSection } from "./context"
import { AutomationInstructionsSection } from "./instructions"
import { AutomationNameField } from "./name"
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
  organizationId: string
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
  organizationId,
  values,
}: AutomationDialogProps) {
  // biome-ignore lint/correctness/useExhaustiveDependencies: fire once on mount
  useEffect(() => {
    onReady?.()
  }, [])

  const actions = createDialogActions(values, onValuesChange)
  const skillList = useQuery(api.skills.catalog.list, { organizationId })
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
            Tell Jori what to do, what it can access, and when to run.
          </DialogDescription>
        </DialogHeader>

        {/* Form semantics only: this editor spans several sections and an
            accidental Enter must not save it, so the explicit button stays
            the sole way to submit. */}
        <DialogForm>
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
            organizationId={organizationId}
            values={values}
          />

          <DialogFooter>
            <Button type="button" onClick={onSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : null}
              {automation === undefined ? "Create automation" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogForm>
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
  organizationId: string
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
      <VisibilityField
        allowPublic={false}
        help="Only-me automations run with your context and connected accounts; every shared mode runs with organization context and shared integrations only."
        id="automation-visibility"
        noun="automation"
        onChange={props.actions.updateVisibility}
        organizationId={props.organizationId}
        value={props.values.visibility}
      />
      {/* Creation-only: existing automations move through the folder
          surfaces, so edits keep the field out of the way. */}
      {props.automation === undefined ? (
        <FolderField
          id="automation-folder"
          onChange={props.actions.updateFolder}
          organizationId={props.organizationId}
          value={props.values.folderId}
        />
      ) : null}
      <AutomationContextSection scope={props.values.scope} />
      <AutomationInstructionsSection
        organizationId={props.organizationId}
        additionalSurfaces={props.additionalSurfaces}
        error={props.instructionsError}
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
        organizationId={props.organizationId}
        webSearch={props.values.webSearch}
      />
      <AutomationTiming
        organizationId={props.organizationId}
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
    updateFolder: (folderId: string | null) => updateValues({ folderId }),
    updateInstructions: (
      instructions: string,
      surfaces: AutomationFormValues["surfaces"]
    ) => updateValues({ instructions, surfaces }),
    updateName: (name: string) => updateValues({ name }),
    updateVisibility: (visibility: AutomationFormValues["visibility"]) =>
      updateValues({ visibility, scope: derivedScope(visibility) }),
    updateWebSearch: (webSearch: boolean) => {
      writeAutomationWebSearchPreference(webSearch)
      updateValues({ webSearch })
    },
  }
}
