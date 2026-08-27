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
import { MaterialDetailFields } from "../shared/materials/fields"
import { ColumnEditor } from "./columns"
import {
  type ColumnDraft,
  columnDraftsIssue,
  draftsFromColumns,
  draftsToColumns,
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
  const issue = columnDraftsIssue(form.drafts)

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
        <div className="grid gap-4">
          <MaterialDetailFields
            description={form.description}
            idPrefix="table-edit"
            name={form.name}
            onDescriptionChange={form.setDescription}
            onNameChange={form.setName}
          />
          <ColumnEditor
            allowRequired={false}
            drafts={form.drafts}
            onChange={form.setDrafts}
          />
          {issue === undefined ? null : (
            <p className="text-destructive text-xs">{issue}</p>
          )}
        </div>
        <DialogFooter>
          <Button
            disabled={
              form.name.trim() === "" || issue !== undefined || form.isSaving
            }
            onClick={() => void form.submit()}
            type="button"
          >
            {form.isSaving ? <Loader2 className="animate-spin" /> : null}
            Save changes
          </Button>
        </DialogFooter>
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
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setName(table?.name ?? "")
    setDescription(table?.description ?? "")
    setDrafts(table === undefined ? [] : draftsFromColumns(table.columns))
  }, [table])

  async function submit() {
    if (table === undefined) {
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
    isSaving,
    name,
    setDescription,
    setDrafts,
    setName,
    submit,
  }
}
