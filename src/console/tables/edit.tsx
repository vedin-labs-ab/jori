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
import { type TableDetail } from "./types"

/** All an edit needs of a table; its summary and its detail both fit. */
export type EditableTable = Pick<
  TableDetail,
  "description" | "name" | "tableId"
>

/** Rename and describe the table. Columns live in the grid itself — the
 *  New column header cell and each column's details sheet. */
export function EditTableDialog({
  onOpenChange,
  organizationId,
  table,
}: {
  onOpenChange: (isOpen: boolean) => void
  organizationId: string
  table: EditableTable | undefined
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
            Rename the table or update the note that helps others find it.
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
  table: EditableTable | undefined,
  onSaved: () => void
) {
  const update = useMutation(api.tables.console.update)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [errors, setErrors] = useState<{ name?: string }>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setName(table?.name ?? "")
    setDescription(table?.description ?? "")
    setErrors({})
  }, [table])

  async function submit() {
    if (table === undefined) {
      return
    }

    if (name.trim() === "") {
      setErrors({ name: "Give the table a name." })

      return
    }

    setIsSaving(true)

    try {
      await update({
        organizationId,
        tableId: table.tableId,
        name,
        description,
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
    errors,
    isSaving,
    name,
    setDescription,
    // Validation shows only after a submit attempt; new input in the field
    // clears its error right away.
    setName: (next: string) => {
      setErrors({})
      setName(next)
    },
    submit,
  }
}
