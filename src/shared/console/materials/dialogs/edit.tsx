import { Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MaterialDescriptionField, MaterialNameField } from "../fields"
import { DialogForm } from "../form"

/** All an edit needs of a material; a summary and a detail both fit. */
export type EditableMaterial = { description?: string; name: string }

export type MaterialEdit = { description: string; name: string }

/** Rename and describe a table or a store. Everything else about them —
 *  columns, schema, value — is edited on their own pages. */
export function EditMaterialDialog({
  blurb,
  isSaving,
  material,
  noun,
  onOpenChange,
  onSave,
}: {
  blurb: string
  isSaving: boolean
  /** The material being edited; undefined closes the dialog. */
  material: EditableMaterial | undefined
  noun: string
  onOpenChange: (isOpen: boolean) => void
  onSave: (values: MaterialEdit) => void
}) {
  const form = useMaterialEdit(material, noun)
  const idPrefix = `${noun}-edit`

  return (
    <Dialog
      open={material !== undefined}
      onOpenChange={(open) => {
        if (!isSaving) {
          onOpenChange(open)
        }
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit {noun}</DialogTitle>
          <DialogDescription>{blurb}</DialogDescription>
        </DialogHeader>
        <DialogForm
          disabled={isSaving}
          onSubmit={() => {
            const values = form.submit()

            if (values !== undefined) {
              onSave(values)
            }
          }}
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
          <DialogFooter>
            <Button disabled={isSaving} type="submit">
              {isSaving ? <Loader2 className="animate-spin" /> : null}
              Save changes
            </Button>
          </DialogFooter>
        </DialogForm>
      </DialogContent>
    </Dialog>
  )
}

/** The draft, reseeded whenever another material opens. Validation shows
 *  only after a submit attempt; new input in the field clears its error
 *  right away. */
function useMaterialEdit(material: EditableMaterial | undefined, noun: string) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [nameError, setNameError] = useState<string>()

  useEffect(() => {
    setName(material?.name ?? "")
    setDescription(material?.description ?? "")
    setNameError(undefined)
  }, [material])

  return {
    description,
    name,
    nameError,
    setDescription,
    setName: (next: string) => {
      setNameError(undefined)
      setName(next)
    },
    submit: (): MaterialEdit | undefined => {
      if (name.trim() === "") {
        setNameError(`Give the ${noun} a name.`)

        return undefined
      }

      return { description, name }
    },
  }
}
