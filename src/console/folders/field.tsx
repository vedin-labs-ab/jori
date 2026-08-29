import { useQuery } from "convex/react"
import { ChevronsUpDown, Folder } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "../../../convex/_generated/api"
import { FolderPicker } from "./picker"

/** Optional "Folder" field for resource create dialogs: the shared folder
 *  tree picker in a popover, with "No folder" (null) as the clearable
 *  default. Selecting is a click, never a submit, so the field is safe
 *  inside Enter-submitting dialog forms. */
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
  const [isOpen, setIsOpen] = useState(false)
  const tree = useQuery(api.folders.console.tree, { organizationId })
  const folders = tree?.status === "ready" ? tree.folders : undefined
  const selected = folders?.find((folder) => folder.folderId === value)

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>Folder</Label>
      <Popover onOpenChange={setIsOpen} open={isOpen}>
        <PopoverTrigger asChild>
          <Button
            className="justify-between font-normal"
            id={id}
            type="button"
            variant="outline"
          >
            {selected === undefined ? (
              <span className="text-muted-foreground">No folder</span>
            ) : (
              <span className="flex min-w-0 items-center gap-2">
                <Folder className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{selected.name}</span>
              </span>
            )}
            <ChevronsUpDown className="text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-(--radix-popover-trigger-width) p-2"
        >
          {folders === undefined ? (
            <div className="grid gap-2">
              <Skeleton className="h-6" />
              <Skeleton className="h-6" />
            </div>
          ) : (
            <FolderPicker
              currentId={value}
              folders={folders}
              onSelect={(folderId) => {
                onChange(folderId)
                setIsOpen(false)
              }}
              selectedId={value}
            />
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}
