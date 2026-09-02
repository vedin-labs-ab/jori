import { type ReactNode, useMemo } from "react"
import {
  type GrantOptions,
  VisibilityField,
} from "@/shared/console/visibility/field"
import { derivedScope, getJobScopeConflict } from "../../access"
import { type JobPolicyPermissions } from "../../access/policy"
import { type JobFormValues } from "../../types"
import { readJobInstructionsError, readJobNameError } from "../errors"
import { readAdditionalJobSurfaces } from "../instructions/document"
import { AccessFields } from "./access"
import { JobContextSection } from "./context"
import { JobInstructionsSection } from "./instructions"
import { JobNameField } from "./name"
import { JobTiming } from "./timing"

/** The Folder field's contract: the fields say where it sits and what it
 *  edits; the host supplies the picker, since the folder tree is its to
 *  query. */
export type JobFolderField = (props: {
  id: string
  onChange: (folderId: string | null) => void
  value: string | null
}) => ReactNode

export type JobEditorFieldsProps = {
  /** The last save's error, shown on the field it belongs to. */
  error: string | undefined
  /** The Event tab's fields, bound by the host. */
  eventFields: ReactNode
  /** The Folder field; left out, no folder is offered. */
  folderField?: JobFolderField
  /** Who the sharing field may offer. */
  grantOptions: GrantOptions
  onValuesChange: (values: JobFormValues) => void
  permissions: JobPolicyPermissions
  /** Changes with the permission policy, so the instructions rebuild
   *  their pills against it. */
  policyKey: string
  showRunPreview: boolean
  /** Organization skill names, for `/` mentions; empty while loading. */
  skills: readonly string[]
  values: JobFormValues
}

/** Everything between a job editor's header and footer — name, sharing,
 *  folder, context, instructions, access, and timing — over one set of
 *  form values. */
export function JobEditorFields(props: JobEditorFieldsProps) {
  const { onValuesChange, values } = props
  const { actions, additionalSurfaces, instructionsError, nameError } =
    useFieldState(props)

  return (
    <div className="grid gap-4">
      <JobNameField
        error={nameError}
        onValueChange={actions.updateName}
        value={values.name}
      />
      <VisibilityField
        help="Only-me jobs run with your context and connected accounts; every shared mode runs with organization context and shared integrations only."
        id="job-visibility"
        noun="job"
        onChange={actions.updateVisibility}
        options={props.grantOptions}
        value={values.visibility}
      />
      {props.folderField?.({
        id: "job-folder",
        onChange: actions.updateFolder,
        value: values.folderId,
      })}
      <JobContextSection scope={values.scope} />
      <JobInstructionsSection
        additionalSurfaces={additionalSurfaces}
        error={instructionsError}
        onWebSearchChange={actions.updateWebSearch}
        onValueChange={actions.updateInstructions}
        permissions={props.permissions}
        policyKey={props.policyKey}
        skills={props.skills}
        values={values}
      />
      <AccessFields
        additionalSurfaces={additionalSurfaces}
        onAdditionalSurfaceChange={actions.updateAdditionalSurface}
        onAdditionalSurfaceRemove={actions.removeAdditionalSurface}
        onWebSearchChange={actions.updateWebSearch}
        permissions={props.permissions}
        scope={values.scope}
        webSearch={values.webSearch}
      />
      <JobTiming
        eventFields={props.eventFields}
        showRunPreview={props.showRunPreview}
        onValuesChange={onValuesChange}
        values={values}
      />
    </div>
  )
}

/** What the sections derive from the values and the last save error: the
 *  field updaters, the access saved outside the instruction references,
 *  and each field's share of the error. A sharing conflict shows on the
 *  instructions at once, without waiting for a save to report it. */
function useFieldState({
  error,
  onValuesChange,
  values,
}: JobEditorFieldsProps) {
  const scopeConflict = getJobScopeConflict(values.scope, values.surfaces)
  const additionalSurfaces = useMemo(
    () =>
      readAdditionalJobSurfaces({
        description: values.instructions,
        surfaces: values.surfaces,
      }),
    [values.instructions, values.surfaces]
  )

  return {
    actions: createFieldActions(values, onValuesChange),
    additionalSurfaces,
    instructionsError:
      scopeConflict?.message ??
      readJobInstructionsError(error, values.instructions),
    nameError: readJobNameError(error, values.name),
  }
}

function createFieldActions(
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
    updateWebSearch: (webSearch: boolean) => updateValues({ webSearch }),
  }
}
