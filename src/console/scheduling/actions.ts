import {
  applyScheduleReadScope,
  insertScheduleSurfaceMention,
  normalizeScheduleSurfaceMentions,
  removeScheduleSurfaceMention,
  type ScheduleReadScope,
  type ScheduleSurfaceAccess,
  type ScheduleSurfaceProvider,
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
    insertSurface: (provider: ScheduleSurfaceProvider) => {
      const description = insertScheduleSurfaceMention(
        normalizeScheduleSurfaceMentions(values.description),
        provider
      )

      updateDescriptionState({ description, onValuesChange, values })
    },
    normalizeDescription: () => {
      updateDescriptionState({
        description: normalizeScheduleSurfaceMentions(values.description),
        onValuesChange,
        values,
      })
    },
    removeSurface: (provider: ScheduleSurfaceProvider) => {
      updateDescriptionState({
        description: removeScheduleSurfaceMention(values.description, provider),
        onValuesChange,
        values,
      })
    },
    updateDescription: (description: string) => {
      updateDescriptionState({ description, onValuesChange, values })
    },
    updateName: (name: string) => {
      onValuesChange({ ...values, name })
    },
    updateReadScope: (readScope: ScheduleReadScope) => {
      onValuesChange({
        ...values,
        readScope,
        surfaces: applyScheduleReadScope(values.surfaces, readScope),
      })
    },
    updateSurfaceAccess: (
      provider: ScheduleSurfaceProvider,
      access: ScheduleSurfaceAccess
    ) => {
      onValuesChange({
        ...values,
        surfaces: values.surfaces.map((surface) =>
          surface.provider === provider ? { ...surface, access } : surface
        ),
      })
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
