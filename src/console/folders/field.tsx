import { useQuery } from "convex/react"
import { FolderPickerField } from "@/shared/console/folders/field"
import { api } from "../../../convex/_generated/api"

/** The Folder field over the organization's own tree. */
export function FolderField({
  id,
  onChange,
  organizationId,
  value,
}: {
  id: string
  onChange: (folderId: string | null) => void
  organizationId: string
  value: string | null
}) {
  const tree = useQuery(api.folders.console.tree, { organizationId })

  return (
    <FolderPickerField
      folders={tree?.status === "ready" ? tree.folders : undefined}
      id={id}
      onChange={onChange}
      value={value}
    />
  )
}
