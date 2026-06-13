import { type ReactMutation, useMutation } from "convex/react"
import { useState } from "react"
import { api } from "../../../../convex/_generated/api"
import { readErrorMessage } from "../../error"
import { type AutomationPolicyPermissions } from "../policy"
import { type Automation, type AutomationFormValues } from "../types"
import {
  automationFormValues,
  createAutomationArgs,
  updateAutomationArgs,
} from "./payload"

export type AutomationEditor = ReturnType<typeof useAutomationEditor>

export function useAutomationEditor(
  tenantId: string,
  permissions?: AutomationPolicyPermissions
) {
  return {
    ...useAutomationForm(tenantId, permissions),
    ...useAutomationDeletion(tenantId),
  }
}

function useAutomationForm(
  tenantId: string,
  permissions?: AutomationPolicyPermissions
) {
  const create = useMutation(api.automations.console.create)
  const update = useMutation(api.automations.console.update)
  const [formAutomation, setFormAutomation] = useState<Automation>()
  const [formValues, setFormValues] = useState<AutomationFormValues>(
    automationFormValues(undefined)
  )
  const [formError, setFormError] = useState<string>()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  function openForm(automation: Automation | undefined) {
    setFormAutomation(automation)
    setFormValues(automationFormValues(automation))
    setFormError(undefined)
    setIsFormOpen(true)
  }

  async function saveAutomation() {
    setFormError(undefined)
    setIsSaving(true)
    try {
      await persistAutomation({
        create,
        formAutomation,
        formValues,
        permissions,
        tenantId,
        update,
      })
      setIsFormOpen(false)
    } catch (error) {
      setFormError(readErrorMessage(error, "Could not save automation."))
    } finally {
      setIsSaving(false)
    }
  }

  return {
    formError,
    formAutomation,
    formValues,
    isFormOpen,
    isSaving,
    openCreateForm: () => openForm(undefined),
    openEditForm: openForm,
    saveAutomation,
    setFormValues,
    setIsFormOpen,
  }
}

async function persistAutomation({
  create,
  formAutomation,
  formValues,
  permissions,
  tenantId,
  update,
}: {
  create: ReactMutation<typeof api.automations.console.create>
  formAutomation: Automation | undefined
  formValues: AutomationFormValues
  permissions?: AutomationPolicyPermissions
  tenantId: string
  update: ReactMutation<typeof api.automations.console.update>
}) {
  if (formAutomation === undefined) {
    const result = createAutomationArgs(formValues, { permissions })

    if ("error" in result) {
      throw new Error(result.error)
    }

    await create({ tenantId, ...result.args })
    return
  }

  const result = updateAutomationArgs(formValues, formAutomation, {
    permissions,
  })

  if ("error" in result) {
    throw new Error(result.error)
  }

  await update({ tenantId, automationId: formAutomation.id, ...result.args })
}

function useAutomationDeletion(tenantId: string) {
  const remove = useMutation(api.automations.console.remove)
  const [deletingAutomationId, setDeletingAutomationId] = useState<string>()
  const [deleteError, setDeleteError] = useState<string>()

  async function deleteAutomation(automation: Automation) {
    setDeletingAutomationId(automation.id)
    setDeleteError(undefined)
    try {
      await remove({ tenantId, automationId: automation.id })
    } catch (error) {
      setDeleteError(readErrorMessage(error, "Could not delete automation."))
    } finally {
      setDeletingAutomationId(undefined)
    }
  }

  return { deleteError, deleteAutomation, deletingAutomationId }
}
