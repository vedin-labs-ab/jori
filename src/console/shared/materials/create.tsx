import { type Visibility } from "@contracts/visibility"
import { type GenericId } from "convex/values"
import { Loader2 } from "lucide-react"
import { type ReactNode, useState } from "react"
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
import { showErrorToast } from "@/shared/console/error"
import {
  MaterialDescriptionField,
  MaterialNameField,
} from "@/shared/console/materials/fields"
import { AdvancedSettings, DialogForm } from "@/shared/console/materials/form"
import { VisibilityField } from "../visibility/field"

/** The create flow every material kind shares: name, description, and the
 *  advanced folder and sharing fields. Only the noun, the blurb under the
 *  title, and the mutation differ between kinds. */
export function CreateMaterialDialog({
  blurb,
  create,
  folderField,
  initialFolderId,
  isOpen,
  noun,
  onOpenChange,
  organizationId,
}: {
  blurb: string
  create: (args: CreateMaterialArgs) => Promise<unknown>
  /** The folder picker, supplied by the page: this module sits below the
   *  folders domain and may not reach into it. */
  folderField: (props: {
    id: string
    onChange: (folderId: string | null) => void
    value: string | null
  }) => ReactNode
  /** Pre-selects the Folder field, e.g. on a folder page's "New" menu. */
  initialFolderId?: string
  isOpen: boolean
  noun: string
  onOpenChange: (isOpen: boolean) => void
  organizationId: string
}) {
  const form = useCreateMaterial({
    create,
    initialFolderId: initialFolderId ?? null,
    noun,
    onCreated: () => onOpenChange(false),
    organizationId,
  })
  const idPrefix = `${noun}-create`

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
          <DialogTitle>Create {noun}</DialogTitle>
          <DialogDescription>{blurb}</DialogDescription>
        </DialogHeader>
        <DialogForm
          disabled={form.isCreating}
          onSubmit={() => void form.submit()}
        >
          <MaterialNameField
            error={form.nameError}
            idPrefix={idPrefix}
            name={form.name}
            onNameChange={form.setName}
          />
          <MaterialDescriptionField
            description={form.description}
            idPrefix={idPrefix}
            onDescriptionChange={form.setDescription}
          />
          <AdvancedSettings>
            {folderField({
              id: `${idPrefix}-folder`,
              onChange: form.setFolderId,
              value: form.folderId,
            })}
            <VisibilityField
              id={`${idPrefix}-visibility`}
              noun={noun}
              onChange={form.setVisibility}
              organizationId={organizationId}
              value={form.visibility}
            />
          </AdvancedSettings>
          <DialogFooter>
            <Button disabled={form.isCreating} type="submit">
              {form.isCreating ? <Loader2 className="animate-spin" /> : null}
              Create {noun}
            </Button>
          </DialogFooter>
        </DialogForm>
      </DialogContent>
    </Dialog>
  )
}

type CreateMaterialArgs = {
  description?: string
  folderId?: GenericId<"folders">
  name: string
  organizationId: string
  visibility?: Visibility
}

function useCreateMaterial({
  create,
  initialFolderId,
  noun,
  onCreated,
  organizationId,
}: {
  create: (args: CreateMaterialArgs) => Promise<unknown>
  initialFolderId: string | null
  noun: string
  onCreated: () => void
  organizationId: string
}) {
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
      setNameError(`Give the ${noun} a name.`)

      return
    }

    setIsCreating(true)

    try {
      await create({
        organizationId,
        name,
        description: description.trim() === "" ? undefined : description,
        visibility,
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
      showErrorToast(error, `Could not create the ${noun}.`)
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
