import {
  Database,
  File,
  FolderPlus,
  Plus,
  Table2,
  Workflow,
} from "lucide-react"
import { type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useEditMenuFocus } from "../edit/state"
import { type FolderCreation } from "./types"

// The console's "New" entries — a folder plus every resource that can be
// created in place — shared by the folder page's header and empty state,
// the sidebar group's "+" action, and each tree row's menu.

type NewMenuHandlers = {
  /** Ran with the resource type to create; the owner creates inline or opens its setup flow. */
  onCreate: (creation: FolderCreation) => void
  /** Ran for the folder entry; the owner creates and starts renaming inline. */
  onNewFolder: () => void
}

/** Icons match how `resourcePresentation` renders each type in lists. */
const resourceEntries = [
  { creation: "table", icon: Table2, label: "Table" },
  { creation: "store", icon: Database, label: "Store" },
  { creation: "file", icon: File, label: "File" },
  { creation: "job", icon: Workflow, label: "Job" },
] as const

/** "New" as a submenu, the first entry of the folder "…" menus. */
export function NewInFolderSub(handlers: NewMenuHandlers) {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Plus className="text-muted-foreground" />
        New
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <NewResourceItems labels="bare" {...handlers} />
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}

/** "New" as the button a folder page and a folder's empty state carry. */
export function NewInFolderButton(handlers: NewMenuHandlers) {
  return (
    <NewInFolderMenu {...handlers}>
      <Button type="button">
        <Plus />
        New
      </Button>
    </NewInFolderMenu>
  )
}

/** "New" as its own dropdown around a caller-supplied trigger. */
export function NewInFolderMenu({
  children,
  ...handlers
}: NewMenuHandlers & { children: ReactNode }) {
  const onCloseAutoFocus = useEditMenuFocus()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-44"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <NewResourceItems labels="prefixed" {...handlers} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Bare labels sit under a "New" submenu trigger that already says so;
 *  standalone menus spell out "New …" per entry. */
function NewResourceItems({
  labels,
  onCreate,
  onNewFolder,
}: NewMenuHandlers & { labels: "bare" | "prefixed" }) {
  return (
    <>
      <DropdownMenuItem onSelect={onNewFolder}>
        <FolderPlus className="text-muted-foreground" />
        {labels === "bare" ? "Subfolder" : "New folder"}
      </DropdownMenuItem>
      {resourceEntries.map((entry) => (
        <DropdownMenuItem
          key={entry.creation}
          onSelect={() => onCreate(entry.creation)}
        >
          <entry.icon className="text-muted-foreground" />
          {labels === "bare" ? entry.label : `New ${entry.label.toLowerCase()}`}
        </DropdownMenuItem>
      ))}
    </>
  )
}
