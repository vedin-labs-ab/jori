import { lazy, Suspense, useEffect, useState } from "react"
import { useToolPermissions } from "../../permissions/controller"
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
export function useAutomationEditorHost(tenantId: string) {
  const permissions = useToolPermissions(tenantId)
  const editor = useAutomationEditor(tenantId, permissions.permissions)
  const isDialogMounted = useAutomationDialogMount(editor.isFormOpen)

  return {
    editor,
    preloadDialog: () => {
      void loadAutomationDialog()
    },
    dialog: isDialogMounted ? (
      <Suspense fallback={null}>
        <AutomationDialog
          error={editor.formError}
          isOpen={editor.isFormOpen}
          isSaving={editor.isSaving}
          onOpenChange={editor.setIsFormOpen}
          onSave={editor.saveAutomation}
          onValuesChange={editor.setFormValues}
          permissions={permissions.permissions}
          policyKey={automationPolicyKey(permissions.permissions)}
          automation={editor.formAutomation}
          tenantId={tenantId}
          values={editor.formValues}
        />
      </Suspense>
    ) : null,
  }
}

function useAutomationDialogMount(isFormOpen: boolean) {
  const [hasOpened, setHasOpened] = useState(false)

  useEffect(() => {
    if (isFormOpen) {
      setHasOpened(true)
    }
  }, [isFormOpen])

  return isFormOpen || hasOpened
}
