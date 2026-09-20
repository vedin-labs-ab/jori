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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useEditMenuFocus } from "../edit/state"
import {
  MenuItem,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
} from "../menu/items"
import { type FolderCreation } from "./types"

// The console's "New" entries — a folder plus every resource that can be
// created in place — shared by the folder page's header and empty state,
// the sidebar group's "+" action, each tree row's menu, and a right-click
// on a folder listing's background.

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

/** "New" as a submenu, the first entry of the folder "…" menus and of a
 *  listing's right-click. At the top level the folder entry is no one's
 *  subfolder. */
export function NewInFolderSub({
  isTopLevel = false,
  ...handlers
}: NewMenuHandlers & { isTopLevel?: boolean }) {
  return (
    <MenuSub>
      <MenuSubTrigger>
        <Plus />
        New
      </MenuSubTrigger>
      <MenuSubContent>
        <NewResourceItems labels={isTopLevel ? "top" : "bare"} {...handlers} />
      </MenuSubContent>
    </MenuSub>
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

const folderLabel = {
  bare: "Subfolder",
  prefixed: "New folder",
  top: "Folder",
}

/** Bare labels sit under a "New" submenu trigger that already says so;
 *  standalone menus spell out "New …" per entry. */
function NewResourceItems({
  labels,
  onCreate,
  onNewFolder,
}: NewMenuHandlers & { labels: "bare" | "prefixed" | "top" }) {
  return (
    <>
      <MenuItem onSelect={onNewFolder}>
        <FolderPlus />
        {folderLabel[labels]}
      </MenuItem>
      {resourceEntries.map((entry) => (
        <MenuItem
          key={entry.creation}
          onSelect={() => onCreate(entry.creation)}
        >
          <entry.icon />
          {labels === "prefixed"
            ? `New ${entry.label.toLowerCase()}`
            : entry.label}
        </MenuItem>
      ))}
    </>
  )
}
