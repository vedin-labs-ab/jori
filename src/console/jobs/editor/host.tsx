import { lazy, Suspense, useRef } from "react"
import { jobPolicyKey } from "@/shared/console/jobs/access/policy"
import { useRetainedMount } from "@/shared/console/retain"
import { useToolPermissions } from "../../permissions/controller"
import { useJobEditor } from "."

let jobDialogModule: Promise<typeof import("./dialog")> | undefined

function loadJobDialog() {
  jobDialogModule ??= import("./dialog")
  return jobDialogModule
}

// The dialog pulls in the TipTap editor, which dwarfs every page using it.
// Loading it lazily keeps the editor out of the route chunks.
const JobDialog = lazy(async () => ({
  default: (await loadJobDialog()).JobDialog,
}))

/**
 * Job editor state plus its lazily mounted dialog, shared by every
 * page that opens the create/edit flow. Render `dialog` once per page.
 */
export function useJobEditorHost(organizationId: string) {
  const permissions = useToolPermissions(organizationId)
  const editor = useJobEditor(organizationId, permissions.permissions)
  const isDialogMounted = useRetainedMount(editor.isFormOpen)
  const mount = useRef<{ isReady: boolean; waiters: (() => void)[] }>({
    isReady: false,
    waiters: [],
  })

  return {
    editor,
    /** The organization's tool policy, for everything that reads a brief. */
    permissions: permissions.permissions,
    // Awaitable so flows that swap into the editor can wait for the chunk;
    // fire-and-forget callers (hover warmup) just ignore the promise.
    preloadDialog: () => loadJobDialog().then(() => undefined),
    // Resolves once the dialog is actually in the DOM — downloading the
    // chunk is not enough; the first TipTap mount is the visible wait.
    whenDialogReady: () =>
      mount.current.isReady
        ? Promise.resolve()
        : new Promise<void>((resolve) => mount.current.waiters.push(resolve)),
    dialog: isDialogMounted ? (
      <Suspense fallback={null}>
        <JobDialog
          onReady={() => {
            mount.current.isReady = true
            for (const resolve of mount.current.waiters.splice(0)) {
              resolve()
            }
          }}
          error={editor.formError}
          isOpen={editor.isFormOpen}
          isSaving={editor.isSaving}
          onOpenChange={editor.setIsFormOpen}
          onSave={editor.saveJob}
          onValuesChange={editor.setFormValues}
          permissions={permissions.permissions}
          policyKey={jobPolicyKey(permissions.permissions)}
          job={editor.formJob}
          organizationId={organizationId}
          values={editor.formValues}
        />
      </Suspense>
    ) : null,
  }
}
