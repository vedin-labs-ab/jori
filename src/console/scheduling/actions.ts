import {
  writeScheduleReadScopePreference,
  writeScheduleWebSearchPreference,
} from "./preferences"
import {
  applyScheduleReadScope,
  type ScheduleReadScope,
  type ScheduleSurfaceFormValue,
  syncScheduleSurfaces,
} from "./surfaces"
import { type ScheduleFormValues } from "./types"

export function createScheduleDialogActions({
  onValuesChange,
  values,
}: {
  onValuesChange: (values: ScheduleFormValues) => void
  values: ScheduleFormValues
}) {
  return {
    normalizeDescription: () => {
      updateDescriptionState({
        description: values.description,
        onValuesChange,
        values,
      })
    },
    updateInstructions: (
      description: string,
      surfaces: ScheduleSurfaceFormValue[]
    ) => {
      onValuesChange({ ...values, description, surfaces })
    },
    updateName: (name: string) => {
      onValuesChange({ ...values, name })
    },
    updateReadScope: (readScope: ScheduleReadScope) => {
      writeScheduleReadScopePreference(readScope)
      onValuesChange({
        ...values,
        readScope,
        surfaces: applyScheduleReadScope(values.surfaces, readScope),
      })
    },
    updateWebSearch: (webSearch: boolean) => {
      writeScheduleWebSearchPreference(webSearch)
      onValuesChange({ ...values, webSearch })
    },
  }
}

function updateDescriptionState({
  description,
  onValuesChange,
  values,
}: {
  description: string
  onValuesChange: (values: ScheduleFormValues) => void
  values: ScheduleFormValues
}) {
  onValuesChange({
    ...values,
    description,
    surfaces: syncScheduleSurfaces(
      description,
      values.surfaces,
      values.readScope
    ),
  })
}
