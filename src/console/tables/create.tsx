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
import { AdvancedSettings, DialogForm } from "../shared/materials/form"
import { MaterialScopeField } from "../shared/materials/scope"

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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create table</DialogTitle>
          <DialogDescription>
            Name it now — define its columns right in the table.
          </DialogDescription>
        </DialogHeader>
        <DialogForm
          disabled={form.isCreating}
          onSubmit={() => void form.submit()}
        >
          <MaterialNameField
            error={form.nameError}
            idPrefix="table-create"
            name={form.name}
            onNameChange={form.setName}
          />
          <MaterialDescriptionField
            description={form.description}
            idPrefix="table-create"
            onDescriptionChange={form.setDescription}
          />
          <AdvancedSettings>
            <FolderField
              id="table-create-folder"
              onChange={form.setFolderId}
              organizationId={organizationId}
              value={form.folderId}
            />
            <MaterialScopeField
              id="table-create-scope"
              noun="table"
              onScopeChange={form.setScope}
              scope={form.scope}
            />
          </AdvancedSettings>
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
  const [name, setNameState] = useState("")
  const [nameError, setNameError] = useState<string>()
  const [description, setDescription] = useState("")
  const [scope, setScope] = useState<Scope>("organization")
  const [folderId, setFolderId] = useState(initialFolderId)
  const [isCreating, setIsCreating] = useState(false)

  // Validation shows only after a submit attempt; new input clears it.
  function setName(next: string) {
    setNameState(next)
    setNameError(undefined)
  }

  async function submit() {
    if (name.trim() === "") {
      setNameError("Give the table a name.")

      return
    }

    setIsCreating(true)

    // A table is born with no columns at all; the grid's New column
    // affordance grows the schema in place.
    try {
      await create({
        organizationId,
        name,
        description: description.trim() === "" ? undefined : description,
        scope,
        folderId:
          folderId === null ? undefined : (folderId as GenericId<"folders">),
      })

      toast.success(`Created ${name.trim()}.`)
      setNameState("")
      setDescription("")
      setScope("organization")
      setFolderId(initialFolderId)
      onCreated()
    } catch (error) {
      showErrorToast(error, "Could not create the table.")
    } finally {
      setIsCreating(false)
    }
  }

  return {
    description,
    folderId,
    isCreating,
    name,
    nameError,
    scope,
    setDescription,
    setFolderId,
    setName,
    setScope,
    submit,
  }
}
