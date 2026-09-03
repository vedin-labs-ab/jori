import { useMutation } from "convex/react"
import { type FunctionArgs } from "convex/server"
import { type GenericId } from "convex/values"
import { CreateMaterialDialog } from "@/shared/console/materials/dialogs/create"
import { storeCreateBlurb } from "@/shared/console/stores/list/config"
import { api } from "../../../convex/_generated/api"
import { FolderField } from "../folders/field"
import { useGrantOptions } from "../shared/visibility/options"

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
  const create = useMutation(api.stores.console.create)
  const grantOptions = useGrantOptions(organizationId)

  return (
    <CreateMaterialDialog
      blurb={storeCreateBlurb}
      create={(args) =>
        create({
          ...args,
          organizationId,
          // The form holds ids as plain strings; the mutation wants branded
          // ones, and only the server can vouch for them.
          folderId: args.folderId as GenericId<"folders"> | undefined,
          visibility: args.visibility as FunctionArgs<
            typeof api.stores.console.create
          >["visibility"],
        })
      }
      folderField={(props) => (
        <FolderField {...props} organizationId={organizationId} />
      )}
      grantOptions={grantOptions}
      initialFolderId={initialFolderId}
      isOpen={isOpen}
      noun="store"
      onOpenChange={onOpenChange}
    />
  )
}
