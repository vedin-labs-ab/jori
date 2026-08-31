import { useMutation } from "convex/react"
import { type FunctionArgs } from "convex/server"
import { api } from "../../../convex/_generated/api"
import { FolderField } from "../folders/field"
import { CreateMaterialDialog } from "../shared/materials/form"

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

  return (
    <CreateMaterialDialog
      blurb="Name it now — add an optional schema right in the store."
      create={(args) =>
        create({
          ...args,
          // The form holds visibility with plain string ids; the mutation
          // wants branded ones, and only the server can vouch for them.
          visibility: args.visibility as FunctionArgs<
            typeof api.stores.console.create
          >["visibility"],
        })
      }
      folderField={(props) => (
        <FolderField {...props} organizationId={organizationId} />
      )}
      initialFolderId={initialFolderId}
      isOpen={isOpen}
      noun="store"
      onOpenChange={onOpenChange}
      organizationId={organizationId}
    />
  )
}
