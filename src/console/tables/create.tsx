import { useMutation } from "convex/react"
import { type FunctionArgs } from "convex/server"
import { CreateMaterialDialog } from "@/console/shared/materials/create"
import { api } from "../../../convex/_generated/api"
import { FolderField } from "../folders/field"

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

  return (
    <CreateMaterialDialog
      blurb="Name it now — define its columns right in the table."
      create={(args) =>
        create({
          ...args,
          // The form holds visibility with plain string ids; the mutation
          // wants branded ones, and only the server can vouch for them.
          visibility: args.visibility as FunctionArgs<
            typeof api.tables.console.create
          >["visibility"],
        })
      }
      folderField={(props) => (
        <FolderField {...props} organizationId={organizationId} />
      )}
      initialFolderId={initialFolderId}
      isOpen={isOpen}
      noun="table"
      onOpenChange={onOpenChange}
      organizationId={organizationId}
    />
  )
}
