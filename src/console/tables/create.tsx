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
import { MaterialDetailFields } from "../shared/materials/fields"
import { MaterialScopeField } from "../shared/materials/scope"
import { ColumnEditor } from "./columns"
import {
  type ColumnDraft,
  columnDraftsIssue,
  draftsToColumns,
  newColumnDraft,
} from "./draft"

export function CreateTableDialog({
  isOpen,
  onOpenChange,
  organizationId,
}: {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  organizationId: string
}) {
  const form = useCreateTable(organizationId, () => onOpenChange(false))
  const issue = columnDraftsIssue(form.drafts)

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
        <div className="grid gap-4">
          <MaterialDetailFields
            description={form.description}
            idPrefix="table-create"
            name={form.name}
            onDescriptionChange={form.setDescription}
            onNameChange={form.setName}
          />
          <MaterialScopeField
            id="table-create-scope"
            onScopeChange={form.setScope}
            scope={form.scope}
          />
          <ColumnEditor
            allowRequired
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
              form.name.trim() === "" || issue !== undefined || form.isCreating
            }
            onClick={() => void form.submit()}
            type="button"
          >
            {form.isCreating ? <Loader2 className="animate-spin" /> : null}
            Create table
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function useCreateTable(organizationId: string, onCreated: () => void) {
  const create = useMutation(api.tables.console.create)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [scope, setScope] = useState<Scope>("organization")
  const [drafts, setDrafts] = useState<ColumnDraft[]>(() => [newColumnDraft()])
  const [isCreating, setIsCreating] = useState(false)

  async function submit() {
    setIsCreating(true)

    try {
      await create({
        organizationId,
        name,
        description: description.trim() === "" ? undefined : description,
        scope,
        columns: draftsToColumns(drafts, []),
      })
      toast.success(`Created ${name.trim()}.`)
      setName("")
      setDescription("")
      setScope("organization")
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
    isCreating,
    name,
    scope,
    setDescription,
    setDrafts,
    setName,
    setScope,
    submit,
  }
}
