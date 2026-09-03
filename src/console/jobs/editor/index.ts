import { type ReactMutation, useMutation } from "convex/react"
import { useRef, useState } from "react"
import { toast } from "sonner"
import { readErrorMessage, showErrorToast } from "@/shared/console/error"
import { type JobPolicyPermissions } from "@/shared/console/jobs/access/policy"
import { isJobFieldError } from "@/shared/console/jobs/editor/errors"
import { jobFormValues } from "@/shared/console/jobs/editor/save"
import { type Job, type JobFormValues } from "@/shared/console/jobs/types"
import { api } from "../../../../convex/_generated/api"
import { readJobPreferences } from "./preferences"

/** The mutation-args builders reach the markdown codec, which ships with the
 *  editor dialog. Loading them at save time keeps that weight off the pages
 *  that only mount the host. */
const loadJobArgs = () => import("@/shared/console/jobs/editor/save/args")

type JobPersistence = {
  create: ReactMutation<typeof api.jobs.console.create>
  formJob: Job | undefined
  formValues: JobFormValues
  permissions?: JobPolicyPermissions
  organizationId: string
  update: ReactMutation<typeof api.jobs.console.update>
}

export function useJobEditor(
  organizationId: string,
  permissions?: JobPolicyPermissions
) {
  return {
    organizationId,
    ...useJobForm(organizationId, permissions),
    ...useJobControl(organizationId),
    ...useJobDeletion(organizationId),
  }
}

/** The persistence endpoints a form save can land on. */
function useJobSavers() {
  return {
    create: useMutation(api.jobs.console.create),
    update: useMutation(api.jobs.console.update),
  }
}

function useJobForm(
  organizationId: string,
  permissions?: JobPolicyPermissions
) {
  const savers = useJobSavers()
  const [formJob, setFormJob] = useState<Job>()
  const [formValues, setFormValues] = useState<JobFormValues>(() =>
    jobFormValues(undefined, readJobPreferences())
  )
  const [formError, setFormError] = useState<string>()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const onSaved = useRef<() => void>(undefined)

  function openForm(job: Job | undefined, initialFolderId?: string) {
    const values = jobFormValues(job, readJobPreferences())

    onSaved.current = undefined
    setFormJob(job)
    setFormValues(
      initialFolderId === undefined
        ? values
        : { ...values, folderId: initialFolderId }
    )
    setFormError(undefined)
    setIsFormOpen(true)
  }

  async function saveJob() {
    setFormError(undefined)
    setIsSaving(true)
    try {
      await persistJob({
        ...savers,
        formJob,
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
    formJob,
    formValues,
    isFormOpen,
    isSaving,
    /** Creation-only: pre-selects the form's Folder field when set. */
    openCreateForm: (initialFolderId?: string) =>
      openForm(undefined, initialFolderId),
    openEditForm: (job: Job) => openForm(job),
    saveJob,
    setFormValues: createFormUpdater(setFormValues, setFormError),
    setIsFormOpen,
  }
}

function createFormUpdater(
  setValues: (values: JobFormValues) => void,
  setError: (error: string | undefined) => void
) {
  return (values: JobFormValues) => {
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

  if (isJobFieldError(message)) {
    setFormError(message)
  } else {
    toast.error(message)
  }
}

async function persistJob({
  create,
  formJob,
  formValues,
  permissions,
  organizationId,
  update,
}: JobPersistence) {
  const { createJobArgs, updateJobArgs } = await loadJobArgs()

  if (formJob === undefined) {
    const result = createJobArgs(formValues, { permissions })

    if ("error" in result) {
      throw new Error(result.error)
    }

    await create({ organizationId, ...result.args })
    return
  }

  const result = updateJobArgs(formValues, formJob, {
    permissions,
  })

  if ("error" in result) {
    throw new Error(result.error)
  }

  await update({
    organizationId,
    jobId: formJob.id,
    ...result.args,
  })
}

function useJobDeletion(organizationId: string) {
  const remove = useMutation(api.jobs.console.remove)
  const [deletingJobId, setDeletingJobId] = useState<string>()

  /** Whether the job is gone, so a page showing it knows to leave. */
  async function deleteJob(job: Job) {
    setDeletingJobId(job.id)
    try {
      await remove({ organizationId, jobId: job.id })

      return true
    } catch (error) {
      showErrorToast(error, "Couldn't delete the job.")

      return false
    } finally {
      setDeletingJobId(undefined)
    }
  }

  return { deleteJob, deletingJobId }
}

function useJobControl(organizationId: string) {
  const pause = useMutation(api.jobs.console.pause)
  const resume = useMutation(api.jobs.console.resume)
  const [controllingJobId, setControllingJobId] = useState<string>()

  async function setJobPaused(job: Job, paused: boolean) {
    setControllingJobId(job.id)
    try {
      const mutation = paused ? pause : resume
      await mutation({ organizationId, jobId: job.id })
    } catch (error) {
      showErrorToast(
        error,
        paused ? "Couldn't pause the job." : "Couldn't resume the job."
      )
    } finally {
      setControllingJobId(undefined)
    }
  }

  return {
    controllingJobId,
    setJobPaused,
  }
}
