import {
  type ReactAction,
  type ReactMutation,
  useAction,
  useMutation,
} from "convex/react"
import { useRef, useState } from "react"
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

/** The persistence endpoints a form save can land on. */
function useAutomationSavers() {
  return {
    create: useMutation(api.automations.console.create),
    createFromPlaybook: useAction(api.playbooks.actions.create),
    update: useMutation(api.automations.console.update),
  }
}

function useAutomationForm(
  tenantId: string,
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

  function openForm(automation: Automation | undefined) {
    onSaved.current = undefined
    setFormAutomation(automation)
    setFormValues(automationFormValues(automation))
    setFormError(undefined)
    setIsFormOpen(true)
  }

  // Prefilled create form (e.g. a playbook opened in the raw builder): no
  // backing automation, so saving creates a fresh one. `onCreated` fires
  // after that save, letting the opener close its own surface too.
  function openDraftForm(values: AutomationFormValues, onCreated?: () => void) {
    onSaved.current = onCreated
    setFormAutomation(undefined)
    setFormValues(values)
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
        tenantId,
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
    openCreateForm: () => openForm(undefined),
    openDraftForm,
    openEditForm: openForm,
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
  const message = readErrorMessage(error, "Couldn't save the automation.")

  if (isAutomationFieldError(message)) {
    setFormError(message)
  } else {
    toast.error(message)
  }
}

async function persistAutomation({
  create,
  createFromPlaybook,
  formAutomation,
  formValues,
  permissions,
  tenantId,
  update,
}: {
  create: ReactMutation<typeof api.automations.console.create>
  createFromPlaybook: ReactAction<typeof api.playbooks.actions.create>
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

    // A playbook draft creates through the playbook action, which also
    // provisions the playbook's artifact; plain drafts stay a mutation.
    const { artifactId: _artifactId, key, playbook, ...plain } = result.args

    if (playbook !== undefined) {
      await createFromPlaybook({
        tenantId,
        playbook,
        ...(key === undefined ? {} : { key }),
        ...plain,
      })
    } else {
      await create({ tenantId, ...plain })
    }
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
