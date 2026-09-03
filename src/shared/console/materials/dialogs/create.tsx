import { type Visibility } from "@contracts/visibility"
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
import { showErrorToast } from "../../error"
import { type GrantOptions, VisibilityField } from "../../visibility/field"
import { MaterialNameField } from "../fields"
import { AdvancedSettings, DialogForm } from "../form"

/** What a create flow hands its host: the name, where the material is
 *  filed (undefined is the root), and who may see it. */
export type CreateMaterialArgs = {
  folderId?: string
  name: string
  visibility: Visibility
}

/** The create flow every material kind shares: the name and the advanced
 *  folder and sharing fields. Only the noun, the blurb under the
 *  title, and what a save runs differ between kinds. */
export function CreateMaterialDialog({
  blurb,
  create,
  folderField,
  grantOptions,
  initialFolderId,
  isOpen,
  noun,
  onOpenChange,
}: {
  blurb: string
  /** Creates the material; a rejection is shown as the failure. */
  create: (args: CreateMaterialArgs) => Promise<unknown>
  /** The folder picker, supplied by the host: this module sits below the
   *  folders domain and may not reach into it. */
  folderField: (props: {
    id: string
    onChange: (folderId: string | null) => void
    value: string | null
  }) => ReactNode
  /** Who the sharing field may offer. */
  grantOptions: GrantOptions
  /** Pre-selects the Folder field, e.g. on a folder page's "New" menu. */
  initialFolderId?: string
  isOpen: boolean
  noun: string
  onOpenChange: (isOpen: boolean) => void
}) {
  const form = useCreateMaterial({
    create,
    initialFolderId: initialFolderId ?? null,
    noun,
    onCreated: () => onOpenChange(false),
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
              options={grantOptions}
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

function useCreateMaterial({
  create,
  initialFolderId,
  noun,
  onCreated,
}: {
  create: (args: CreateMaterialArgs) => Promise<unknown>
  initialFolderId: string | null
  noun: string
  onCreated: () => void
}) {
  const [name, setNameState] = useState("")
  const [nameError, setNameError] = useState<string>()
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
      await create({ name, visibility, folderId: folderId ?? undefined })

      toast.success(`Created ${name.trim()}.`)
      setNameState("")
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
    folderId,
    isCreating,
    name,
    nameError,
    setFolderId,
    setName,
    setVisibility,
    submit,
    visibility,
  }
}
