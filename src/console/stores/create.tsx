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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "../../../convex/_generated/api"
import { FolderField } from "../folders/field"
import { readErrorMessage } from "../shared/error"
import { DialogForm } from "../shared/materials/form"
import { MaterialScopeField } from "../shared/materials/scope"
import { SchemaEditorSection } from "./schema/editor"
import { useSchemaEditor } from "./schema/state"

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
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Create store</DialogTitle>
          <DialogDescription>
            One JSON document validated against a schema fixed at creation.
          </DialogDescription>
        </DialogHeader>
        <DialogForm
          disabled={form.isCreating}
          onSubmit={() => void form.submit()}
        >
          <StoreNameField form={form} />
          <MaterialScopeField
            id="store-create-scope"
            noun="store"
            onScopeChange={form.setScope}
            scope={form.scope}
          />
          <FolderField
            id="store-create-folder"
            onChange={form.setFolderId}
            organizationId={organizationId}
            value={form.folderId}
          />
          <StoreDescriptionField form={form} />
          <SchemaEditorSection editor={form.schema} idPrefix="store-create" />
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

function StoreNameField({ form }: { form: CreateStoreForm }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="store-create-name">Name</Label>
      <div className="grid gap-1">
        <Input
          aria-invalid={form.nameError === undefined ? undefined : true}
          id="store-create-name"
          onChange={(event) => form.setName(event.target.value)}
          value={form.name}
        />
        {form.nameError === undefined ? null : (
          <p className="text-destructive text-xs" role="alert">
            {form.nameError}
          </p>
        )}
      </div>
    </div>
  )
}

function StoreDescriptionField({ form }: { form: CreateStoreForm }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor="store-create-description">Description</Label>
      <Input
        id="store-create-description"
        onChange={(event) => form.setDescription(event.target.value)}
        placeholder="Optional note that helps others find it"
        value={form.description}
      />
    </div>
  )
}

type CreateStoreForm = ReturnType<typeof useCreateStore>

function useCreateStore(
  organizationId: string,
  initialFolderId: string | null,
  onCreated: () => void
) {
  const create = useMutation(api.stores.console.create)
  const schema = useSchemaEditor()
  const [name, setNameState] = useState("")
  const [nameError, setNameError] = useState<string>()
  const [description, setDescription] = useState("")
  const [scope, setScope] = useState<Scope>("organization")
  const [folderId, setFolderId] = useState(initialFolderId)
  const [isCreating, setIsCreating] = useState(false)

  function setName(next: string) {
    setNameState(next)
    setNameError(undefined)
  }

  async function submit() {
    const schemaResult = schema.submit()
    const isNameMissing = name.trim() === ""

    if (isNameMissing) {
      setNameError("Name is required.")
    }

    if (isNameMissing || !schemaResult.ok) {
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
        schema: schemaResult.schema,
      })

      toast.success(`Created ${name.trim()}.`)
      setNameState("")
      setDescription("")
      setScope("organization")
      setFolderId(initialFolderId)
      schema.reset()
      onCreated()
    } catch (error) {
      reportCreateError(error, schema.setSubmitError)
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
    schema,
    scope,
    setDescription,
    setFolderId,
    setName,
    setScope,
    submit,
  }
}

/** Schema errors attach under the schema editor; anything else toasts. */
function reportCreateError(
  error: unknown,
  setSubmitError: (message: string) => void
) {
  const message = readErrorMessage(error, "Could not create the store.")

  if (/schema/i.test(message)) {
    setSubmitError(message)
  } else {
    toast.error(message)
  }
}
