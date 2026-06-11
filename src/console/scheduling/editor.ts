import { type ReactMutation, useMutation } from "convex/react"
import { useState } from "react"
import { api } from "../../../convex/_generated/api"
import { readErrorMessage } from "../error"
import {
  createScheduleArgs,
  scheduleFormValues,
  updateScheduleArgs,
} from "./payload"
import { type Schedule, type ScheduleFormValues } from "./types"

export type ScheduleEditor = ReturnType<typeof useScheduleEditor>

export function useScheduleEditor(tenantId: string) {
  return {
    ...useScheduleForm(tenantId),
    ...useScheduleDeletion(tenantId),
  }
}

function useScheduleForm(tenantId: string) {
  const create = useMutation(api.scheduling.console.create)
  const update = useMutation(api.scheduling.console.update)
  const [formSchedule, setFormSchedule] = useState<Schedule>()
  const [formValues, setFormValues] = useState<ScheduleFormValues>(
    scheduleFormValues(undefined)
  )
  const [formError, setFormError] = useState<string>()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  function openForm(schedule: Schedule | undefined) {
    setFormSchedule(schedule)
    setFormValues(scheduleFormValues(schedule))
    setFormError(undefined)
    setIsFormOpen(true)
  }

  async function saveSchedule() {
    setFormError(undefined)
    setIsSaving(true)
    try {
      await persistSchedule({
        create,
        formSchedule,
        formValues,
        tenantId,
        update,
      })
      setIsFormOpen(false)
    } catch (error) {
      setFormError(readErrorMessage(error, "Could not save schedule."))
    } finally {
      setIsSaving(false)
    }
  }

  return {
    formError,
    formSchedule,
    formValues,
    isFormOpen,
    isSaving,
    openCreateForm: () => openForm(undefined),
    openEditForm: openForm,
    saveSchedule,
    setFormValues,
    setIsFormOpen,
  }
}

async function persistSchedule({
  create,
  formSchedule,
  formValues,
  tenantId,
  update,
}: {
  create: ReactMutation<typeof api.scheduling.console.create>
  formSchedule: Schedule | undefined
  formValues: ScheduleFormValues
  tenantId: string
  update: ReactMutation<typeof api.scheduling.console.update>
}) {
  if (formSchedule === undefined) {
    const result = createScheduleArgs(formValues)

    if ("error" in result) {
      throw new Error(result.error)
    }

    await create({ tenantId, ...result.args })
    return
  }

  const result = updateScheduleArgs(formValues, formSchedule)

  if ("error" in result) {
    throw new Error(result.error)
  }

  await update({ tenantId, scheduleId: formSchedule.id, ...result.args })
}

function useScheduleDeletion(tenantId: string) {
  const remove = useMutation(api.scheduling.console.remove)
  const [deletingScheduleId, setDeletingScheduleId] = useState<string>()
  const [deleteError, setDeleteError] = useState<string>()

  async function deleteSchedule(schedule: Schedule) {
    setDeletingScheduleId(schedule.id)
    setDeleteError(undefined)
    try {
      await remove({ tenantId, scheduleId: schedule.id })
    } catch (error) {
      setDeleteError(readErrorMessage(error, "Could not delete schedule."))
    } finally {
      setDeletingScheduleId(undefined)
    }
  }

  return { deleteError, deleteSchedule, deletingScheduleId }
}
