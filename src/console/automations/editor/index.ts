import { type ReactMutation, useMutation } from "convex/react"
import { useState } from "react"
import { toast } from "sonner"
import { api } from "../../../../convex/_generated/api"
import { readErrorMessage, showErrorToast } from "../../shared/error"
import { type AutomationPolicyPermissions } from "../access/policy"
import { type Automation, type AutomationFormValues } from "../types"
import { isAutomationFieldError } from "./errors"
import {
  automationFormValues,
  createAutomationArgs,
  updateAutomationArgs,
} from "./save"

export type AutomationEditor = ReturnType<typeof useAutomationEditor>

export function useAutomationEditor(
  tenantId: string,
  permissions?: AutomationPolicyPermissions
) {
  return {
    ...useAutomationForm(tenantId, permissions),
    ...useAutomationControl(tenantId),
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
      const message = readErrorMessage(error, "Couldn't save the automation.")

      if (isAutomationFieldError(message)) {
        setFormError(message)
      } else {
        toast.error(message)
      }
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

  async function deleteAutomation(automation: Automation) {
    setDeletingAutomationId(automation.id)
    try {
      await remove({ tenantId, automationId: automation.id })
    } catch (error) {
      showErrorToast(error, "Couldn't delete the automation.")
    } finally {
      setDeletingAutomationId(undefined)
    }
  }

  return { deleteAutomation, deletingAutomationId }
}

function useAutomationControl(tenantId: string) {
  const pause = useMutation(api.automations.console.pause)
  const resume = useMutation(api.automations.console.resume)
  const [controllingAutomationId, setControllingAutomationId] =
    useState<string>()

  async function pauseAutomation(automation: Automation) {
    await controlAutomation({
      automation,
      fallback: "Couldn't pause the automation.",
      mutation: pause,
    })
  }

  async function resumeAutomation(automation: Automation) {
    await controlAutomation({
      automation,
      fallback: "Couldn't resume the automation.",
      mutation: resume,
    })
  }

  async function controlAutomation({
    automation,
    fallback,
    mutation,
  }: {
    automation: Automation
    fallback: string
    mutation: (args: {
      automationId: Automation["id"]
      tenantId: string
    }) => Promise<unknown>
  }) {
    setControllingAutomationId(automation.id)
    try {
      await mutation({ tenantId, automationId: automation.id })
    } catch (error) {
      showErrorToast(error, fallback)
    } finally {
      setControllingAutomationId(undefined)
    }
  }

  return {
    controllingAutomationId,
    pauseAutomation,
    resumeAutomation,
  }
}
