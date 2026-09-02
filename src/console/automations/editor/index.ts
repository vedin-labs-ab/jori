import { type ReactMutation, useMutation } from "convex/react"
import { useRef, useState } from "react"
import { toast } from "sonner"
import { api } from "../../../../convex/_generated/api"
import { readErrorMessage, showErrorToast } from "../../shared/error"
import { type AutomationPolicyPermissions } from "../access/policy"
import { type Automation, type AutomationFormValues } from "../types"
import { isAutomationFieldError } from "./errors"
import { automationFormValues } from "./save"

export type AutomationEditor = ReturnType<typeof useAutomationEditor>

/** The mutation-args builders reach the markdown codec, which ships with the
 *  editor dialog. Loading them at save time keeps that weight off the pages
 *  that only mount the host. */
const loadAutomationArgs = () => import("./save/args")

type AutomationPersistence = {
  create: ReactMutation<typeof api.automations.console.create>
  formAutomation: Automation | undefined
  formValues: AutomationFormValues
  permissions?: AutomationPolicyPermissions
  organizationId: string
  update: ReactMutation<typeof api.automations.console.update>
}

export function useAutomationEditor(
  organizationId: string,
  permissions?: AutomationPolicyPermissions
) {
  return {
    organizationId,
    ...useAutomationForm(organizationId, permissions),
    ...useAutomationControl(organizationId),
    ...useAutomationDeletion(organizationId),
  }
}

/** The persistence endpoints a form save can land on. */
function useAutomationSavers() {
  return {
    create: useMutation(api.automations.console.create),
    update: useMutation(api.automations.console.update),
  }
}

function useAutomationForm(
  organizationId: string,
  permissions?: AutomationPolicyPermissions
) {
  const savers = useAutomationSavers()
  const [formAutomation, setFormAutomation] = useState<Automation>()
  const [formValues, setFormValues] = useState<AutomationFormValues>(
    automationFormValues(undefined)
  )
  const [formError, setFormError] = useState<string>()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const onSaved = useRef<() => void>(undefined)

  function openForm(
    automation: Automation | undefined,
    initialFolderId?: string
  ) {
    const values = automationFormValues(automation)

    onSaved.current = undefined
    setFormAutomation(automation)
    setFormValues(
      initialFolderId === undefined
        ? values
        : { ...values, folderId: initialFolderId }
    )
    setFormError(undefined)
    setIsFormOpen(true)
  }

  async function saveAutomation() {
    setFormError(undefined)
    setIsSaving(true)
    try {
      await persistAutomation({
        ...savers,
        formAutomation,
        formValues,
        permissions,
        organizationId,
      })
      setIsFormOpen(false)
      onSaved.current?.()
      onSaved.current = undefined
    } catch (error) {
      reportSaveError(error, setFormError)
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
    /** Creation-only: pre-selects the form's Folder field when set. */
    openCreateForm: (initialFolderId?: string) =>
      openForm(undefined, initialFolderId),
    openEditForm: (automation: Automation) => openForm(automation),
    saveAutomation,
    setFormValues: createFormUpdater(setFormValues, setFormError),
    setIsFormOpen,
  }
}

function createFormUpdater(
  setValues: (values: AutomationFormValues) => void,
  setError: (error: string | undefined) => void
) {
  return (values: AutomationFormValues) => {
    setError(undefined)
    setValues(values)
  }
}

/** Field-level errors land inline on the form; anything else toasts. */
function reportSaveError(
  error: unknown,
  setFormError: (message: string) => void
) {
  const message = readErrorMessage(error, "Couldn't save the job.")

  if (isAutomationFieldError(message)) {
    setFormError(message)
  } else {
    toast.error(message)
  }
}

async function persistAutomation({
  create,
  formAutomation,
  formValues,
  permissions,
  organizationId,
  update,
}: AutomationPersistence) {
  const { createAutomationArgs, updateAutomationArgs } =
    await loadAutomationArgs()

  if (formAutomation === undefined) {
    const result = createAutomationArgs(formValues, { permissions })

    if ("error" in result) {
      throw new Error(result.error)
    }

    await create({ organizationId, ...result.args })
    return
  }

  const result = updateAutomationArgs(formValues, formAutomation, {
    permissions,
  })

  if ("error" in result) {
    throw new Error(result.error)
  }

  await update({
    organizationId,
    automationId: formAutomation.id,
    ...result.args,
  })
}

function useAutomationDeletion(organizationId: string) {
  const remove = useMutation(api.automations.console.remove)
  const [deletingAutomationId, setDeletingAutomationId] = useState<string>()

  async function deleteAutomation(automation: Automation) {
    setDeletingAutomationId(automation.id)
    try {
      await remove({ organizationId, automationId: automation.id })
    } catch (error) {
      showErrorToast(error, "Couldn't delete the job.")
    } finally {
      setDeletingAutomationId(undefined)
    }
  }

  return { deleteAutomation, deletingAutomationId }
}

function useAutomationControl(organizationId: string) {
  const pause = useMutation(api.automations.console.pause)
  const resume = useMutation(api.automations.console.resume)
  const [controllingAutomationId, setControllingAutomationId] =
    useState<string>()

  async function setAutomationPaused(automation: Automation, paused: boolean) {
    setControllingAutomationId(automation.id)
    try {
      const mutation = paused ? pause : resume
      await mutation({ organizationId, automationId: automation.id })
    } catch (error) {
      showErrorToast(
        error,
        paused ? "Couldn't pause the job." : "Couldn't resume the job."
      )
    } finally {
      setControllingAutomationId(undefined)
    }
  }

  return {
    controllingAutomationId,
    setAutomationPaused,
  }
}
