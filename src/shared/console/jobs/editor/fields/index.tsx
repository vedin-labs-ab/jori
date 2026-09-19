import { type ReactNode, useMemo } from "react"
import {
  type GrantOptions,
  VisibilityField,
} from "@/shared/console/visibility/field"
import { AdvancedSettings } from "../../../materials/form"
import { derivedScope, getJobScopeConflict } from "../../access"
import { type JobPolicyPermissions } from "../../access/policy"
import { type JobFormValues } from "../../types"
import { readJobInstructionsError, readJobNameError } from "../errors"
import { readAdditionalJobSurfaces } from "../instructions/document"
import { AccessFields } from "./access"
import { JobInstructionsSection } from "./instructions"
import { JobNameField } from "./name"
import { JobTiming } from "./timing"

/** The Folder field's contract: the fields say where it sits and what it
 *  edits; the host supplies the picker, since the folder tree is its to
 *  query. */
type JobFolderField = (props: {
  id: string
  onChange: (folderId: string | null) => void
  value: string | null
}) => ReactNode

export type JobEditorFieldsProps = {
  /** Who the sharing reaches, said under the sharing field by the host. */
  audience?: ReactNode
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

/** Everything between a job editor's header and footer, over one set of
 *  form values: the name, the brief, its access and timing, and under
 *  Advanced settings by the footer, where it is filed and who sees it.
 *  The container every field inside keys its layout to. */
export function JobEditorFields(props: JobEditorFieldsProps) {
  const { onValuesChange, values } = props
  const { actions, additionalSurfaces, instructionsError, nameError } =
    useFieldState(props)

  return (
    // The fields measure themselves: the same set edits in a dialog on a
    // phone, in a wide dialog, and beside the landing page's copy.
    <div className="@container/editor grid gap-4">
      <JobNameField
        error={nameError}
        onValueChange={actions.updateName}
        value={values.name}
      />
      <JobInstructionsSection
        additionalSurfaces={additionalSurfaces}
        error={instructionsError}
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
        permissions={props.permissions}
        scope={values.scope}
      />
      <JobTiming
        eventFields={props.eventFields}
        showRunPreview={props.showRunPreview}
        onValuesChange={onValuesChange}
        values={values}
      />
      <AdvancedSettings>
        {props.folderField?.({
          id: "job-folder",
          onChange: actions.updateFolder,
          value: values.folderId,
        })}
        <div className="grid gap-2">
          <VisibilityField
            help="Private jobs use personal connections. Shared jobs use workspace connections."
            id="job-visibility"
            noun="job"
            onChange={actions.updateVisibility}
            options={props.grantOptions}
            value={values.visibility}
          />
          {props.audience}
        </div>
      </AdvancedSettings>
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
  }
}
