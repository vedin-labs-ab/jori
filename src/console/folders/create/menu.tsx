import {
  CalendarClock,
  Database,
  File,
  FolderPlus,
  Plus,
  Table2,
} from "lucide-react"
import { type ReactNode } from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { type FolderCreation } from "./dialogs"

// The console's "New" entries — a folder plus every resource that can be
// created in place — shared by the folder page header, its empty state, the
// sidebar group's "+" action, and the folder "…" menus' submenu.

type NewMenuHandlers = {
  /** Ran with the resource type to create; the owner opens its dialog. */
  onCreate: (creation: FolderCreation) => void
  /** Ran for the folder entry; the owner opens the folder name dialog. */
  onNewFolder: () => void
}

/** Icons match how `resourcePresentation` renders each type in lists. */
const resourceEntries = [
  { creation: "table", icon: Table2, label: "Table" },
  { creation: "store", icon: Database, label: "Store" },
  { creation: "file", icon: File, label: "File" },
  { creation: "automation", icon: CalendarClock, label: "Automation" },
] as const

/** "New" as a submenu, the first entry of the folder "…" menus. */
export function NewInFolderSub(handlers: NewMenuHandlers) {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Plus />
        New
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <NewResourceItems labels="bare" {...handlers} />
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  )
}

/** "New" as its own dropdown around a caller-supplied trigger. */
export function NewInFolderMenu({
  children,
  ...handlers
}: NewMenuHandlers & { children: ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
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
        <FolderPlus />
        {labels === "bare" ? "Subfolder" : "New folder"}
      </DropdownMenuItem>
      {resourceEntries.map((entry) => (
        <DropdownMenuItem
          key={entry.creation}
          onSelect={() => onCreate(entry.creation)}
        >
          <entry.icon />
          {labels === "bare" ? entry.label : `New ${entry.label.toLowerCase()}`}
        </DropdownMenuItem>
      ))}
    </>
  )
}
