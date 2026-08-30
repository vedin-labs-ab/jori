import { type Visibility } from "@contracts/permissions/visibility"
import { useMutation } from "convex/react"
import { type FunctionArgs } from "convex/server"
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
import { VisibilityField } from "../shared/visibility/field"

export function CreateStoreDialog({
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
  const form = useCreateStore(organizationId, initialFolderId ?? null, () =>
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
          <DialogTitle>Create store</DialogTitle>
          <DialogDescription>
            Name it now — add an optional schema right in the store.
          </DialogDescription>
        </DialogHeader>
        <DialogForm
          disabled={form.isCreating}
          onSubmit={() => void form.submit()}
        >
          <MaterialNameField
            error={form.nameError}
            idPrefix="store-create"
            name={form.name}
            onNameChange={form.setName}
          />
          <MaterialDescriptionField
            description={form.description}
            idPrefix="store-create"
            onDescriptionChange={form.setDescription}
          />
          <AdvancedSettings>
            <FolderField
              id="store-create-folder"
              onChange={form.setFolderId}
              organizationId={organizationId}
              value={form.folderId}
            />
            <VisibilityField
              id="store-create-visibility"
              noun="store"
              onChange={form.setVisibility}
              organizationId={organizationId}
              value={form.visibility}
            />
          </AdvancedSettings>
          <DialogFooter>
            <Button disabled={form.isCreating} type="submit">
              {form.isCreating ? <Loader2 className="animate-spin" /> : null}
              Create store
            </Button>
          </DialogFooter>
        </DialogForm>
      </DialogContent>
    </Dialog>
  )
}

function useCreateStore(
  organizationId: string,
  initialFolderId: string | null,
  onCreated: () => void
) {
  const create = useMutation(api.stores.console.create)
  const [name, setNameState] = useState("")
  const [nameError, setNameError] = useState<string>()
  const [description, setDescription] = useState("")
  const [visibility, setVisibility] = useState<Visibility>({
    mode: "organization",
  })
  const [folderId, setFolderId] = useState(initialFolderId)
  const [isCreating, setIsCreating] = useState(false)

  // Validation shows only after a submit attempt; new input clears it.
  function setName(next: string) {
    setNameState(next)
    setNameError(undefined)
  }

  async function submit() {
    if (name.trim() === "") {
      setNameError("Give the store a name.")

      return
    }

    setIsCreating(true)

    try {
      await create({
        organizationId,
        name,
        description: description.trim() === "" ? undefined : description,
        visibility: visibility as FunctionArgs<
          typeof api.stores.console.create
        >["visibility"],
        folderId:
          folderId === null ? undefined : (folderId as GenericId<"folders">),
      })

      toast.success(`Created ${name.trim()}.`)
      setNameState("")
      setDescription("")
      setVisibility({ mode: "organization" })
      setFolderId(initialFolderId)
      onCreated()
    } catch (error) {
      showErrorToast(error, "Could not create the store.")
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
    setDescription,
    setFolderId,
    setName,
    setVisibility,
    submit,
    visibility,
  }
}
