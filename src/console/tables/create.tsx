import { useMutation } from "convex/react"
import { type FunctionArgs } from "convex/server"
import { type GenericId } from "convex/values"
import { CreateMaterialDialog } from "@/shared/console/materials/dialogs/create"
import { api } from "../../../convex/_generated/api"
import { FolderField } from "../folders/field"
import { useGrantOptions } from "../shared/visibility/options"

export function CreateTableDialog({
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
  // A table is born with no columns at all; the grid's New column
  // affordance grows the schema in place.
  const create = useMutation(api.tables.console.create)
  const grantOptions = useGrantOptions(organizationId)

  return (
    <CreateMaterialDialog
      blurb="Name it now — define its columns right in the table."
      create={(args) =>
        create({
          ...args,
          organizationId,
          // The form holds ids as plain strings; the mutation wants branded
          // ones, and only the server can vouch for them.
          folderId: args.folderId as GenericId<"folders"> | undefined,
          visibility: args.visibility as FunctionArgs<
            typeof api.tables.console.create
          >["visibility"],
        })
      }
      folderField={(props) => (
        <FolderField {...props} organizationId={organizationId} />
      )}
      grantOptions={grantOptions}
      initialFolderId={initialFolderId}
      isOpen={isOpen}
      noun="table"
      onOpenChange={onOpenChange}
    />
  )
}
