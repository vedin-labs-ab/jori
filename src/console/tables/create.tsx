import { type Scope } from "@contracts/permissions/scope"
import { useMutation } from "convex/react"
import { type GenericId } from "convex/values"
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
import { FolderField } from "../folders/field"
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
  initialFolderId,
  isOpen,
  onOpenChange,
  organizationId,
}: {
  /** Pre-selects the Folder field, e.g. on a folder page's "New" menu. */
  initialFolderId?: string
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  organizationId: string
}) {
  const form = useCreateTable(organizationId, initialFolderId ?? null, () =>
    onOpenChange(false)
  )

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
          <FolderField
            id="table-create-folder"
            onChange={form.setFolderId}
            organizationId={organizationId}
            value={form.folderId}
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
  initialFolderId: string | null,
  onCreated: () => void
) {
  const create = useMutation(api.tables.console.create)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [scope, setScope] = useState<Scope>("organization")
  const [folderId, setFolderId] = useState(initialFolderId)
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
      await create({
        organizationId,
        name,
        description: description.trim() === "" ? undefined : description,
        scope,
        folderId:
          folderId === null ? undefined : (folderId as GenericId<"folders">),
        columns: draftsToColumns(drafts, []),
      })

      toast.success(`Created ${name.trim()}.`)
      setName("")
      setDescription("")
      setScope("organization")
      setFolderId(initialFolderId)
      setDrafts([newColumnDraft()])
      onCreated()
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
    folderId,
    isCreating,
    name,
    scope,
    setDescription,
    setFolderId,
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
