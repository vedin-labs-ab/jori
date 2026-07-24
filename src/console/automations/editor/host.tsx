import { lazy, Suspense, useRef } from "react"
import { useToolPermissions } from "../../permissions/controller"
import { useRetainedMount } from "../../shared/retain"
import { automationPolicyKey } from "../access/policy"
import { useAutomationEditor } from "."

let automationDialogModule: Promise<typeof import("./dialog")> | undefined

function loadAutomationDialog() {
  automationDialogModule ??= import("./dialog")
  return automationDialogModule
}

// The dialog pulls in the TipTap editor, which dwarfs every page using it.
// Loading it lazily keeps the editor out of the route chunks.
const AutomationDialog = lazy(async () => ({
  default: (await loadAutomationDialog()).AutomationDialog,
}))

export type AutomationEditorHost = ReturnType<typeof useAutomationEditorHost>

/**
 * Automation editor state plus its lazily mounted dialog, shared by every
 * page that opens the create/edit flow. Render `dialog` once per page.
 */
export function useAutomationEditorHost(organizationId: string) {
  const permissions = useToolPermissions(organizationId)
  const editor = useAutomationEditor(organizationId, permissions.permissions)
  const isDialogMounted = useRetainedMount(editor.isFormOpen)
  const mount = useRef<{ isReady: boolean; waiters: (() => void)[] }>({
    isReady: false,
    waiters: [],
  })

  return {
    editor,
    // Awaitable so flows that swap into the editor can wait for the chunk;
    // fire-and-forget callers (hover warmup) just ignore the promise.
    preloadDialog: () => loadAutomationDialog().then(() => undefined),
    // Resolves once the dialog is actually in the DOM — downloading the
    // chunk is not enough; the first TipTap mount is the visible wait.
    whenDialogReady: () =>
      mount.current.isReady
        ? Promise.resolve()
        : new Promise<void>((resolve) => mount.current.waiters.push(resolve)),
    dialog: isDialogMounted ? (
      <Suspense fallback={null}>
        <AutomationDialog
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
          onSave={editor.saveAutomation}
          onValuesChange={editor.setFormValues}
          permissions={permissions.permissions}
          policyKey={automationPolicyKey(permissions.permissions)}
          automation={editor.formAutomation}
          organizationId={organizationId}
          values={editor.formValues}
        />
      </Suspense>
    ) : null,
  }
}
