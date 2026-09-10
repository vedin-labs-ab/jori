import { useEffect, useRef, useState } from "react"
import { DemoEventFields } from "@/landing/demo/dialogs/editor"
import { demoJobs } from "@/landing/demo/fixtures/jobs"
import { grantOptions } from "@/landing/demo/fixtures/people"
import {
  demoPermissions,
  demoSkills,
} from "@/landing/demo/fixtures/permissions"
import { useDemoFolders, useDemoWorkspace } from "@/landing/demo/workspace"
import { FolderPickerField } from "@/shared/console/folders/field"
import {
  type JobPolicyPermissions,
  jobPolicyKey,
} from "@/shared/console/jobs/access/policy"
import { JobEditorDialog } from "@/shared/console/jobs/editor/dialog"
import { jobInstructionMarkerErrors } from "@/shared/console/jobs/editor/errors"
import {
  ToolReferenceContext,
  type ToolReferenceLoaderProps,
  type ToolReferences,
} from "@/shared/console/jobs/editor/instructions/access/wire"
import { jobFormValues } from "@/shared/console/jobs/editor/save"

const now = Date.UTC(2026, 8, 9, 9, 15)

/** Real shared job editor over the existing isolated demo workspace.
 * Only service timing/data differs. No Convex or identity writes occur.
 * F8 reloads permission props; F9 fails that reload; F10 restores them.
 */
export function JobState({ state }: { state: string }) {
  const { actions } = useDemoWorkspace()
  const folders = useDemoFolders()
  const [job] = useState(() => initialJob(state))
  const [values, setValues] = useState(() => jobFormValues(job))
  const [open, setOpen] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string>()
  const permissions = useJobPermissions()
  const attempts = useRef(0)

  async function save() {
    setSaving(true)
    setError(undefined)
    const attempt = attempts.current++
    await new Promise((resolve) => setTimeout(resolve, 1100))
    if (state === "jobs-save-error" && attempt === 0) {
      setError(jobInstructionMarkerErrors.incompleteAccess)
      setSaving(false)
      return
    }
    const problem = await actions.saveJob(values, job)
    setSaving(false)
    if (problem === undefined) {
      setOpen(false)
    } else {
      setError(problem)
    }
  }

  return (
    <ToolReferenceContext.Provider value={JobReferences}>
      <JobEditorDialog
        error={error}
        eventFields={<DemoEventFields />}
        folderField={(field) => (
          <FolderPickerField {...field} folders={folders} />
        )}
        grantOptions={grantOptions}
        isOpen={open}
        isSaving={saving}
        job={job}
        onOpenChange={setOpen}
        onSave={() => void save()}
        onValuesChange={(next) => {
          setError(undefined)
          setValues(next)
        }}
        permissions={permissions}
        policyKey={jobPolicyKey(permissions)}
        skills={demoSkills}
        values={values}
      />
    </ToolReferenceContext.Provider>
  )
}

function initialJob(state: string) {
  const job = demoJobs(now)[0]
  if (state === "jobs-save-success" || state === "jobs-save-error") {
    return job
  }
  return { ...job, instructions: job.instructions.replace("@GitHub", "GitHub") }
}

function useJobPermissions() {
  const [permissions, setPermissions] =
    useState<JobPolicyPermissions>(demoPermissions)

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    function changePermissions(event: KeyboardEvent) {
      if (!["F8", "F9", "F10"].includes(event.key)) {
        return
      }
      event.preventDefault()
      clearTimeout(timer)
      if (event.key === "F10") {
        setPermissions(demoPermissions)
        return
      }
      setPermissions(undefined)
      timer = setTimeout(
        () => setPermissions(event.key === "F9" ? null : demoPermissions),
        1100
      )
    }
    window.addEventListener("keydown", changePermissions)
    return () => {
      window.removeEventListener("keydown", changePermissions)
      clearTimeout(timer)
    }
  }, [])

  return permissions
}

/** Representative wire-schema data at the documented host seam. The real
 * schema loader, pending control, JsonDialog and direction switch render it.
 */
function JobReferences({ onChange, tools }: ToolReferenceLoaderProps) {
  const key = JSON.stringify(tools)
  useEffect(() => {
    const timer = setTimeout(() => {
      const references: ToolReferences = {}
      for (const tool of JSON.parse(key) as string[]) {
        references[tool] = {
          request: {
            type: "object",
            properties: {
              query: { type: "string", description: "Repository search query" },
              limit: { type: "integer", minimum: 1, maximum: 100 },
            },
            required: ["query"],
          },
          response: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    title: { type: "string" },
                    url: { type: "string", format: "uri" },
                    repository: { type: "string" },
                    state: { type: "string", enum: ["open", "closed"] },
                  },
                },
              },
              hasMore: { type: "boolean" },
            },
          },
        }
      }
      onChange(references)
    }, 1100)
    return () => clearTimeout(timer)
  }, [key, onChange])
  return null
}
