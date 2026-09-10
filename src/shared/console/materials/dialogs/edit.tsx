import { Loader2 } from "lucide-react"
import { useLayoutEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { MaterialNameField } from "../fields"
import { DialogForm } from "../form"

/** All an edit needs of a material; a summary and a detail both fit. */
type EditableMaterial = { name: string }

export type MaterialEdit = { name: string }

/** Rename a table, a store, or a file. Everything else about them,
 *  columns, schema, value, content, is edited on their own pages. */
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
      <DialogContent className="sm:max-w-md">
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
  const [nameError, setNameError] = useState<string>()

  useLayoutEffect(() => {
    if (material !== undefined) {
      setName(material.name)
      setNameError(undefined)
    }
  }, [material])

  return {
    name,
    nameError,
    setName: (next: string) => {
      setNameError(undefined)
      setName(next)
    },
    submit: (): MaterialEdit | undefined => {
      if (name.trim() === "") {
        setNameError(`Give the ${noun} a name.`)

        return undefined
      }

      return { name }
    },
  }
}
