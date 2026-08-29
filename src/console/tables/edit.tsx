import { useMutation } from "convex/react"
import { Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
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
import { api } from "../../../convex/_generated/api"
import { showErrorToast } from "../shared/error"
import {
  MaterialDescriptionField,
  MaterialNameField,
} from "../shared/materials/fields"
import { DialogForm } from "../shared/materials/form"
import { ColumnEditor } from "./columns"
import {
  type ColumnDraft,
  draftsFromColumns,
  draftsToColumns,
  type TableFormErrors,
  validateTableForm,
} from "./draft"
import { type TableDetail } from "./types"

/** Rename and describe the table, and evolve its columns: existing ones may
 *  change display name only, new ones join as optional columns. */
export function EditTableDialog({
  onOpenChange,
  organizationId,
  table,
}: {
  onOpenChange: (isOpen: boolean) => void
  organizationId: string
  table: TableDetail | undefined
}) {
  const form = useEditTable(organizationId, table, () => onOpenChange(false))

  return (
    <Dialog
      open={table !== undefined}
      onOpenChange={(open) => {
        if (!form.isSaving) {
          onOpenChange(open)
        }
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit table</DialogTitle>
          <DialogDescription>
            Existing columns keep their key and type; new columns are optional
            so current rows stay valid.
          </DialogDescription>
        </DialogHeader>
        <DialogForm
          disabled={form.isSaving}
          onSubmit={() => void form.submit()}
        >
          <MaterialNameField
            error={form.errors.name}
            idPrefix="table-edit"
            name={form.name}
            onNameChange={form.setName}
          />
          <MaterialDescriptionField
            description={form.description}
            idPrefix="table-edit"
            onDescriptionChange={form.setDescription}
          />
          <ColumnEditor
            allowRequired={false}
            drafts={form.drafts}
            onChange={form.setDrafts}
          />
          {form.errors.columns === undefined ? null : (
            <p className="text-destructive text-xs" role="alert">
              {form.errors.columns}
            </p>
          )}
          <DialogFooter>
            <Button disabled={form.isSaving} type="submit">
              {form.isSaving ? <Loader2 className="animate-spin" /> : null}
              Save changes
            </Button>
          </DialogFooter>
        </DialogForm>
      </DialogContent>
    </Dialog>
  )
}

function useEditTable(
  organizationId: string,
  table: TableDetail | undefined,
  onSaved: () => void
) {
  const update = useMutation(api.tables.console.update)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [drafts, setDrafts] = useState<ColumnDraft[]>([])
  const [errors, setErrors] = useState<TableFormErrors>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setName(table?.name ?? "")
    setDescription(table?.description ?? "")
    setDrafts(table === undefined ? [] : draftsFromColumns(table.columns))
    setErrors({})
  }, [table])

  async function submit() {
    if (table === undefined) {
      return
    }

    const found = validateTableForm(name, drafts)

    setErrors(found)

    if (found.name !== undefined || found.columns !== undefined) {
      return
    }

    setIsSaving(true)

    try {
      await update({
        organizationId,
        tableId: table.tableId,
        name,
        description,
        columns: draftsToColumns(drafts, table.columns),
      })
      toast.success("Table updated.")
      onSaved()
    } catch (error) {
      showErrorToast(error, "Could not update the table.")
    } finally {
      setIsSaving(false)
    }
  }

  return {
    description,
    drafts,
    errors,
    isSaving,
    name,
    setDescription,
    // Validation shows only after a submit attempt; new input in a field
    // clears that field's error right away.
    setDrafts: (next: ColumnDraft[]) => {
      setErrors((current) => ({ ...current, columns: undefined }))
      setDrafts(next)
    },
    setName: (next: string) => {
      setErrors((current) => ({ ...current, name: undefined }))
      setName(next)
    },
    submit,
  }
}
