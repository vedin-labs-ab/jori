import { useMutation } from "convex/react"
import { Loader2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { readErrorMessage } from "@/shared/console/error"
import { DialogForm } from "@/shared/console/materials/form"
import { type StoreDetail } from "@/shared/console/stores/types"
import { api } from "../../../../convex/_generated/api"
import { SchemaEditorSection } from "./editor"
import { useSchemaEditor } from "./state"

/** View and edit the store's schema in place. The schema is an optional
 *  constraint: saving one makes every value write satisfy it, removing it
 *  lets the store accept any JSON object again. An empty schema would say
 *  the same thing as no schema, so saving waits for a field. The backend
 *  refuses a schema the current value violates, and that refusal surfaces
 *  under the editor so the person can fix the value or the schema. */
export function StoreSchemaDialog({
  onOpenChange,
  organizationId,
  store,
}: {
  onOpenChange: (isOpen: boolean) => void
  organizationId: string
  store: StoreDetail | undefined
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={store !== undefined}>
      <DialogContent className="sm:max-w-xl">
        {store === undefined ? null : (
          <SchemaDialogForm
            onClose={() => onOpenChange(false)}
            organizationId={organizationId}
            store={store}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function SchemaDialogForm({
  onClose,
  organizationId,
  store,
}: {
  onClose: () => void
  organizationId: string
  store: StoreDetail
}) {
  const editor = useSchemaEditor(store.schema)
  const save = useSchemaSave(organizationId, store, editor, onClose)
  const hasSchema = store.schema !== undefined
  const isArchived = store.archivedAt !== undefined
  const isSaving = save.saving !== undefined
  const isSaveBlocked = isSaving || isArchived || !editor.canSubmit

  function submit() {
    const result = editor.submit()

    if (result.ok) {
      void save.write(result.schema, "Schema saved.")
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{hasSchema ? "Schema" : "Add schema"}</DialogTitle>
        <DialogDescription>
          {hasSchema
            ? "Every value write must satisfy this schema. Edit it, or remove it to accept any JSON object."
            : "Optional: once a schema is saved, every value write must satisfy it."}
        </DialogDescription>
      </DialogHeader>
      <DialogForm disabled={isSaveBlocked} onSubmit={submit}>
        <SchemaEditorSection editor={editor} schema={store.schema} />
        <DialogFooter>
          {hasSchema ? (
            <Button
              disabled={isSaving || isArchived}
              onClick={() => void save.write(null, "Schema removed.")}
              type="button"
              variant="outline"
            >
              {save.saving === "remove" ? (
                <Loader2 className="animate-spin" />
              ) : null}
              Remove schema
            </Button>
          ) : null}
          <Button disabled={isSaveBlocked} type="submit">
            {save.saving === "save" ? (
              <Loader2 className="animate-spin" />
            ) : null}
            Save schema
          </Button>
        </DialogFooter>
      </DialogForm>
    </>
  )
}

/** Persist a schema change; `null` removes the constraint. Failures — the
 *  backend rejecting the schema or the current value violating it — attach
 *  under the editor rather than toasting. */
function useSchemaSave(
  organizationId: string,
  store: StoreDetail,
  editor: ReturnType<typeof useSchemaEditor>,
  onClose: () => void
) {
  const writeSchema = useMutation(api.stores.console.writeSchema)
  const [saving, setSaving] = useState<"remove" | "save">()

  async function write(schema: unknown, success: string) {
    setSaving(schema === null ? "remove" : "save")

    try {
      await writeSchema({ organizationId, storeId: store.storeId, schema })
      toast.success(success)
      onClose()
    } catch (error) {
      editor.setSubmitError(
        readErrorMessage(error, "Could not save the schema.")
      )
    } finally {
      setSaving(undefined)
    }
  }

  return { saving, write }
}
