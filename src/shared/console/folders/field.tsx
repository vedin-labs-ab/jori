import { ChevronsUpDown, Folder, FolderRoot } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { FolderSelect } from "./picker/select"
import { type FolderRow } from "./types"

/** Optional "Folder" field for resource create dialogs: the shared folder
 *  tree picker in a popover, with "No folder" (null) as the clearable
 *  default. Selecting is a click, never a submit, so the field is safe
 *  inside Enter-submitting dialog forms. The rows arrive as a prop; the
 *  host queries them. */
export function FolderPickerField({
  folders,
  id,
  onChange,
  value,
}: {
  /** Undefined while the rows are still on their way. */
  folders: FolderRow[] | undefined
  id: string
  onChange: (folderId: string | null) => void
  value: string | null
}) {
  const selected = folders?.find((folder) => folder.folderId === value)

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>Folder</Label>
      <FolderSelect folders={folders} onChange={onChange} value={value}>
        <Button
          className="justify-between font-normal"
          id={id}
          type="button"
          variant="outline"
        >
          {selected === undefined ? (
            <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
              {value === null ? (
                <FolderRoot aria-hidden className="size-4 shrink-0" />
              ) : null}
              <span>No folder</span>
            </span>
          ) : (
            <span className="flex min-w-0 items-center gap-2">
              <Folder className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{selected.name}</span>
            </span>
          )}
          <ChevronsUpDown className="text-muted-foreground" />
        </Button>
      </FolderSelect>
    </div>
  )
}
