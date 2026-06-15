import {
  type AutomationSurfaceFormValue,
  syncAutomationSurfaces,
} from "../access"
import { type AutomationPolicyPermissions } from "../access/policy"
import { type AutomationFormValues } from "../types"
import { writeAutomationWebSearchPreference } from "./preferences"

export function createAutomationDialogActions({
  onValuesChange,
  permissions,
  values,
}: {
  onValuesChange: (values: AutomationFormValues) => void
  permissions?: AutomationPolicyPermissions
  values: AutomationFormValues
}) {
  return {
    normalizeDescription: () => {
      updateDescriptionState({
        instructions: values.instructions,
        onValuesChange,
        permissions,
        values,
      })
    },
    updateInstructions: (
      instructions: string,
      surfaces: AutomationSurfaceFormValue[]
    ) => {
      onValuesChange({ ...values, instructions, surfaces })
    },
    updateName: (name: string) => {
      onValuesChange({ ...values, name })
    },
    updateWebSearch: (webSearch: boolean) => {
      writeAutomationWebSearchPreference(webSearch)
      onValuesChange({ ...values, webSearch })
    },
  }
}

function updateDescriptionState({
  instructions,
  onValuesChange,
  permissions,
  values,
}: {
  instructions: string
  onValuesChange: (values: AutomationFormValues) => void
  permissions?: AutomationPolicyPermissions
  values: AutomationFormValues
}) {
  onValuesChange({
    ...values,
    instructions,
    surfaces: syncAutomationSurfaces(
      instructions,
      values.surfaces,
      permissions
    ),
  })
}
