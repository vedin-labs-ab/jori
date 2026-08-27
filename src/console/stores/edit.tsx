import { useMutation } from "convex/react"
import { Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
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
import { type StoreDetail } from "./types"

/** Rename or describe the store; the schema is fixed at creation. */
export function EditStoreDialog({
  onOpenChange,
  organizationId,
  store,
}: {
  onOpenChange: (isOpen: boolean) => void
  organizationId: string
  store: StoreDetail | undefined
}) {
  const update = useMutation(api.stores.console.update)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setName(store?.name ?? "")
    setDescription(store?.description ?? "")
  }, [store])

  async function submit() {
    if (store === undefined) {
      return
    }

    setIsSaving(true)

    try {
      await update({
        organizationId,
        storeId: store.storeId,
        name,
        description,
      })
      toast.success("Store updated.")
      onOpenChange(false)
    } catch (error) {
      showErrorToast(error, "Could not update the store.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog
      open={store !== undefined}
      onOpenChange={(open) => {
        if (!isSaving) {
          onOpenChange(open)
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit store</DialogTitle>
          <DialogDescription>
            Rename the store or update its description.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <MaterialDetailFields
            description={description}
            idPrefix="store-edit"
            name={name}
            onDescriptionChange={setDescription}
            onNameChange={setName}
          />
        </div>
        <DialogFooter>
          <Button
            disabled={name.trim() === "" || isSaving}
            onClick={() => void submit()}
            type="button"
          >
            {isSaving ? <Loader2 className="animate-spin" /> : null}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
