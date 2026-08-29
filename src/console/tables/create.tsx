import { type Scope } from "@contracts/permissions/scope"
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
import { api } from "../../../convex/_generated/api"
import { showErrorToast } from "../shared/error"
import {
  MaterialDescriptionField,
  MaterialNameField,
} from "../shared/materials/fields"
import { DialogForm } from "../shared/materials/form"
import { MaterialScopeField } from "../shared/materials/scope"
import { ColumnEditor } from "./columns"
import {
  type ColumnDraft,
  draftsToColumns,
  newColumnDraft,
  type TableFormErrors,
  validateTableForm,
} from "./draft"

export function CreateTableDialog({
  isOpen,
  onCreated,
  onOpenChange,
  organizationId,
}: {
  isOpen: boolean
  /** Ran with the new table's id, e.g. to file it into a folder. */
  onCreated?: (tableId: string) => void
  onOpenChange: (isOpen: boolean) => void
  organizationId: string
}) {
  const form = useCreateTable(organizationId, (tableId) => {
    onOpenChange(false)
    onCreated?.(tableId)
  })

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!form.isCreating) {
          onOpenChange(open)
        }
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create table</DialogTitle>
          <DialogDescription>
            Define the typed columns rows of this table must follow.
          </DialogDescription>
        </DialogHeader>
        <DialogForm
          disabled={form.isCreating}
          onSubmit={() => void form.submit()}
        >
          <MaterialNameField
            error={form.errors.name}
            idPrefix="table-create"
            name={form.name}
            onNameChange={form.setName}
          />
          <MaterialScopeField
            id="table-create-scope"
            noun="table"
            onScopeChange={form.setScope}
            scope={form.scope}
          />
          <MaterialDescriptionField
            description={form.description}
            idPrefix="table-create"
            onDescriptionChange={form.setDescription}
          />
          <ColumnEditor
            allowRequired
            drafts={form.drafts}
            onChange={form.setDrafts}
          />
          {form.errors.columns === undefined ? null : (
            <p className="text-destructive text-xs" role="alert">
              {form.errors.columns}
            </p>
          )}
          <DialogFooter>
            <Button disabled={form.isCreating} type="submit">
              {form.isCreating ? <Loader2 className="animate-spin" /> : null}
              Create table
            </Button>
          </DialogFooter>
        </DialogForm>
      </DialogContent>
    </Dialog>
  )
}

function useCreateTable(
  organizationId: string,
  onCreated: (tableId: string) => void
) {
  const create = useMutation(api.tables.console.create)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [scope, setScope] = useState<Scope>("organization")
  const [drafts, setDrafts] = useState<ColumnDraft[]>(() => [newColumnDraft()])
  const [errors, setErrors] = useState<TableFormErrors>({})
  const [isCreating, setIsCreating] = useState(false)

  async function submit() {
    const found = validateTableForm(name, drafts)

    setErrors(found)

    if (found.name !== undefined || found.columns !== undefined) {
      return
    }

    setIsCreating(true)

    try {
      const created = (await create({
        organizationId,
        name,
        description: description.trim() === "" ? undefined : description,
        scope,
        columns: draftsToColumns(drafts, []),
      })) as { tableId: string }

      toast.success(`Created ${name.trim()}.`)
      setName("")
      setDescription("")
      setScope("organization")
      setDrafts([newColumnDraft()])
      onCreated(created.tableId)
    } catch (error) {
      showErrorToast(error, "Could not create the table.")
    } finally {
      setIsCreating(false)
    }
  }

  return {
    description,
    drafts,
    errors,
    isCreating,
    name,
    scope,
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
    setScope,
    submit,
  }
}
