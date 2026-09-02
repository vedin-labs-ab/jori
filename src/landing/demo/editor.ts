import { createContext, useContext } from "react"
import { type Job } from "@/shared/console/jobs/types"

/** The one job editor on the page, opened from wherever a job is. */
export type JobEditor = {
  openCreateForm: (folderId?: string) => void
  openEditForm: (job: Job) => void
}

export const JobEditorContext = createContext<JobEditor | null>(null)

export function useJobEditor() {
  const editor = useContext(JobEditorContext)

  if (editor === null) {
    throw new Error("useJobEditor needs a DemoJobEditor above it.")
  }

  return editor
}
