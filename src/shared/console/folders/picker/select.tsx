import { type ReactElement, useState } from "react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import { type FolderRow } from "../types"
import { FolderPicker } from "."

/** The same folder selection behind form fields and compact metadata. */
export function FolderSelect({
  children,
  folders,
  onChange,
  value,
}: {
  children: ReactElement
  folders: FolderRow[] | undefined
  onChange: (folderId: string | null) => void
  value: string | null
}) {
  const [open, setOpen] = useState(false)
  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-72 max-w-[calc(100vw-2rem)] p-1"
      >
        {folders === undefined ? (
          <div
            aria-label="Loading folders"
            className="grid gap-2 p-2"
            role="status"
          >
            <Skeleton className="h-6" />
            <Skeleton className="h-6" />
          </div>
        ) : (
          <FolderPicker
            currentId={value}
            folders={folders}
            selectedId={value}
            onSelect={(folderId) => {
              onChange(folderId)
              setOpen(false)
            }}
          />
        )}
      </PopoverContent>
    </Popover>
  )
}
