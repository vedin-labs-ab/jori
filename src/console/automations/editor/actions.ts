import {
  type AutomationSurfaceFormValue,
  syncAutomationSurfaces,
} from "../surfaces"
import { type AutomationFormValues } from "../types"
import { writeAutomationWebSearchPreference } from "./preferences"

export function createAutomationDialogActions({
  onValuesChange,
  values,
}: {
  onValuesChange: (values: AutomationFormValues) => void
  values: AutomationFormValues
}) {
  return {
    normalizeDescription: () => {
      updateDescriptionState({
        instructions: values.instructions,
        onValuesChange,
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
  values,
}: {
  instructions: string
  onValuesChange: (values: AutomationFormValues) => void
  values: AutomationFormValues
}) {
  onValuesChange({
    ...values,
    instructions,
    surfaces: syncAutomationSurfaces(instructions, values.surfaces),
  })
}
