import { useState } from "react"
import { toast } from "sonner"
import { showErrorToast } from "@/shared/console/error"
import { type MaterialEdit } from "@/shared/console/materials/dialogs/edit"

/** The save behind an edit dialog: one update in flight at a time, a toast
 *  either way, and the dialog closed once the change has landed. */
export function useMaterialUpdate(
  noun: string,
  update: (values: MaterialEdit) => Promise<unknown>,
  onSaved: () => void
) {
  const [isSaving, setIsSaving] = useState(false)

  async function save(values: MaterialEdit) {
    setIsSaving(true)

    try {
      await update(values)
      toast.success(`${noun[0].toUpperCase()}${noun.slice(1)} updated.`)
      onSaved()
    } catch (error) {
      showErrorToast(error, `Could not update the ${noun}.`)
    } finally {
      setIsSaving(false)
    }
  }

  return { isSaving, save: (values: MaterialEdit) => void save(values) }
}
