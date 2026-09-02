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
import { DialogForm } from "@/shared/console/materials/form"
import { api } from "../../../../../convex/_generated/api"
import { FolderField } from "../../../folders/field"
import { VisibilityField } from "../../../shared/visibility/field"
import { getJobScopeConflict } from "../../access"
import { type JobPolicyPermissions } from "../../access/policy"
import { type Job, type JobFormValues } from "../../types"
import { readJobInstructionsError, readJobNameError } from "../errors"
import { readAdditionalJobSurfaces } from "../instructions/document"
import { writeJobWebSearchPreference } from "../preferences"
import { derivedScope } from "../save"
import { AccessFields } from "./access"
import { JobContextSection } from "./context"
import { JobInstructionsSection } from "./instructions"
import { JobNameField } from "./name"
import { JobTiming } from "./timing"

type JobDialogProps = {
  error: string | undefined
  isOpen: boolean
  isSaving: boolean
  onOpenChange: (isOpen: boolean) => void
  onReady?: () => void
  onSave: () => void
  onValuesChange: (values: JobFormValues) => void
  permissions?: JobPolicyPermissions
  policyKey: string
  job: Job | undefined
  organizationId: string
  values: JobFormValues
}

export function JobDialog({
  error,
  isOpen,
  isSaving,
  onOpenChange,
  onReady,
  onSave,
  onValuesChange,
  permissions,
  policyKey,
  job,
  organizationId,
  values,
}: JobDialogProps) {
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
  const scopeConflict = getJobScopeConflict(values.scope, values.surfaces)
  const instructionsError =
    scopeConflict?.message ??
    readJobInstructionsError(error, values.instructions)
  const nameError = readJobNameError(error, values.name)
  const additionalSurfaces = useMemo(
    () =>
      readAdditionalJobSurfaces({
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
            {job === undefined ? "New job" : "Edit job"}
          </DialogTitle>
          <DialogDescription>
            Tell Jori what to do, what it can access, and when to run.
          </DialogDescription>
        </DialogHeader>

        {/* Form semantics only: this editor spans several sections and an
            accidental Enter must not save it, so the explicit button stays
            the sole way to submit. */}
        <DialogForm>
          <JobDialogFields
            actions={actions}
            additionalSurfaces={additionalSurfaces}
            job={job}
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
              {job === undefined ? "Create job" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogForm>
      </DialogContent>
    </Dialog>
  )
}

type DialogFieldsProps = {
  actions: ReturnType<typeof createDialogActions>
  additionalSurfaces: JobFormValues["surfaces"]
  job: Job | undefined
  instructionsError: string | undefined
  nameError: string | undefined
  onValuesChange: (values: JobFormValues) => void
  permissions: JobPolicyPermissions
  policyKey: string
  skills: string[]
  organizationId: string
  values: JobFormValues
}

function JobDialogFields(props: DialogFieldsProps) {
  return (
    <div className="grid gap-4">
      <JobNameField
        error={props.nameError}
        onValueChange={props.actions.updateName}
        value={props.values.name}
      />
      <VisibilityField
        help="Only-me jobs run with your context and connected accounts; every shared mode runs with organization context and shared integrations only."
        id="job-visibility"
        noun="job"
        onChange={props.actions.updateVisibility}
        organizationId={props.organizationId}
        value={props.values.visibility}
      />
      {/* Creation-only: existing jobs move through the folder
          surfaces, so edits keep the field out of the way. */}
      {props.job === undefined ? (
        <FolderField
          id="job-folder"
          onChange={props.actions.updateFolder}
          organizationId={props.organizationId}
          value={props.values.folderId}
        />
      ) : null}
      <JobContextSection scope={props.values.scope} />
      <JobInstructionsSection
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
      <JobTiming
        organizationId={props.organizationId}
        showRunPreview={props.job !== undefined}
        onValuesChange={props.onValuesChange}
        values={props.values}
      />
    </div>
  )
}

function createDialogActions(
  values: JobFormValues,
  onValuesChange: (values: JobFormValues) => void
) {
  const updateValues = (updates: Partial<JobFormValues>) => {
    onValuesChange({ ...values, ...updates })
  }

  return {
    removeAdditionalSurface: (
      integration: JobFormValues["surfaces"][number]["integration"]
    ) =>
      updateValues({
        surfaces: values.surfaces.filter(
          (surface) => surface.integration !== integration
        ),
      }),
    updateAdditionalSurface: (nextSurface: JobFormValues["surfaces"][number]) =>
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
      surfaces: JobFormValues["surfaces"]
    ) => updateValues({ instructions, surfaces }),
    updateName: (name: string) => updateValues({ name }),
    updateVisibility: (visibility: JobFormValues["visibility"]) =>
      updateValues({ visibility, scope: derivedScope(visibility) }),
    updateWebSearch: (webSearch: boolean) => {
      writeJobWebSearchPreference(webSearch)
      updateValues({ webSearch })
    },
  }
}
