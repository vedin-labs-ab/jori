import { Info } from "lucide-react"
import {
  lazy,
  type ReactNode,
  Suspense,
  useCallback,
  useMemo,
  useState,
} from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FolderPickerField } from "@/shared/console/folders/field"
import { jobPolicyKey } from "@/shared/console/jobs/access/policy"
import { jobFormValues } from "@/shared/console/jobs/editor/save"
import { type Job, type JobFormValues } from "@/shared/console/jobs/types"
import { useRetainedMount } from "@/shared/console/retain"
import { folderRows } from "../derive/folders"
import { JobEditorContext } from "../editor"
import { grantOptions } from "../fixtures/people"
import { demoPermissions, demoSkills } from "../fixtures/permissions"
import { type DemoActions } from "../state/actions"
import { useDemoWorkspace } from "../workspace"

// The dialog pulls in the TipTap editor, which dwarfs every page using it.
// Loading it lazily keeps the editor out of the page's own chunk.
const JobEditorDialog = lazy(async () => ({
  default: (await import("@/shared/console/jobs/editor/dialog"))
    .JobEditorDialog,
}))

const policyKey = jobPolicyKey(demoPermissions)

/** One job editor for the whole page, opened from wherever a job is: the
 *  console's dialog over the workspace, mounted on first open. */
export function DemoJobEditor({ children }: { children: ReactNode }) {
  const { actions, state } = useDemoWorkspace()
  const form = useEditorForm(actions)
  const isMounted = useRetainedMount(form.isOpen)
  const editor = useMemo(
    () => ({
      openCreateForm: form.openCreateForm,
      openEditForm: form.openEditForm,
    }),
    [form.openCreateForm, form.openEditForm]
  )
  const folders = useMemo(() => folderRows(state), [state])

  return (
    <JobEditorContext.Provider value={editor}>
      {children}
      {isMounted ? (
        <Suspense fallback={null}>
          <JobEditorDialog
            error={form.error}
            eventFields={<DemoEventFields />}
            folderField={(field) => (
              <FolderPickerField {...field} folders={folders} />
            )}
            grantOptions={grantOptions}
            isOpen={form.isOpen}
            isSaving={false}
            job={form.job}
            onOpenChange={form.setIsOpen}
            onSave={form.save}
            onValuesChange={form.setValues}
            permissions={demoPermissions}
            policyKey={policyKey}
            skills={demoSkills}
            values={form.values}
          />
        </Suspense>
      ) : null}
    </JobEditorContext.Provider>
  )
}

/** What the Event tab holds here. An event trigger is chosen against the
 *  organization's connections, which the demo has none of. */
export function DemoEventFields() {
  return (
    <Alert className="py-2">
      <Info className="size-4" />
      <AlertDescription className="text-xs">
        Event triggers are set in the console, against the integrations your
        organization has connected: Slack, GitHub, Linear, and Notion.
      </AlertDescription>
    </Alert>
  )
}

function useEditorForm(actions: DemoActions) {
  const [job, setJob] = useState<Job>()
  const [values, setValuesState] = useState<JobFormValues>(() =>
    jobFormValues(undefined, { webSearch: false })
  )
  const [error, setError] = useState<string>()
  const [isOpen, setIsOpen] = useState(false)
  const open = useCallback((target: Job | undefined, folderId?: string) => {
    const seeded = jobFormValues(target, { webSearch: false })

    setJob(target)
    setValuesState(folderId === undefined ? seeded : { ...seeded, folderId })
    setError(undefined)
    setIsOpen(true)
  }, [])

  return {
    error,
    isOpen,
    job,
    openCreateForm: useCallback(
      (folderId?: string) => open(undefined, folderId),
      [open]
    ),
    openEditForm: useCallback((target: Job) => open(target), [open]),
    save: () => {
      const problem = actions.saveJob(values, job)

      if (problem === undefined) {
        setIsOpen(false)
      } else {
        setError(problem)
      }
    },
    setIsOpen,
    setValues: (next: JobFormValues) => {
      setError(undefined)
      setValuesState(next)
    },
    values,
  }
}
