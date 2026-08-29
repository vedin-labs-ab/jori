import { Check, Folder, FolderMinus } from "lucide-react"
import { cn } from "@/lib/utils"
import { buildFolderTree, type FolderNode } from "./tree"
import { type FolderRow } from "./types"

// Compact fully-expanded folder tree for the move dialog: "No folder" at
// the top, then every folder indented by depth. The subject's current
// location is marked, and targets that would create a cycle are disabled.

export function FolderPicker({
  className,
  currentId,
  disabledIds,
  folders,
  onSelect,
  selectedId,
}: {
  /** Chrome belongs to the host: a dialog body passes its own border, a
   *  popover already has one and passes nothing. */
  className?: string
  /** Where the subject sits today; null means outside any folder. */
  currentId: string | null
  /** Folders that must not be chosen — a moving folder's own subtree. */
  disabledIds?: ReadonlySet<string>
  folders: FolderRow[]
  onSelect: (folderId: string | null) => void
  selectedId: string | null
}) {
  const tree = buildFolderTree(folders)

  return (
    <div
      className={cn(
        "grid max-h-64 content-start gap-0.5 overflow-y-auto",
        className
      )}
    >
      <PickerRow
        depth={0}
        icon={<FolderMinus className="size-4 shrink-0 text-muted-foreground" />}
        isCurrent={currentId === null}
        isSelected={selectedId === null}
        name="No folder"
        onSelect={() => onSelect(null)}
      />
      {tree.map((node) => (
        <PickerBranch
          currentId={currentId}
          depth={0}
          disabledIds={disabledIds}
          key={node.folderId}
          node={node}
          onSelect={onSelect}
          selectedId={selectedId}
        />
      ))}
    </div>
  )
}

function PickerBranch({
  currentId,
  depth,
  disabledIds,
  node,
  onSelect,
  selectedId,
}: {
  currentId: string | null
  depth: number
  disabledIds: ReadonlySet<string> | undefined
  node: FolderNode<FolderRow>
  onSelect: (folderId: string | null) => void
  selectedId: string | null
}) {
  return (
    <>
      <PickerRow
        depth={depth}
        icon={<Folder className="size-4 shrink-0 text-muted-foreground" />}
        isCurrent={currentId === node.folderId}
        isDisabled={disabledIds?.has(node.folderId)}
        isSelected={selectedId === node.folderId}
        name={node.name}
        onSelect={() => onSelect(node.folderId)}
      />
      {node.children.map((child) => (
        <PickerBranch
          currentId={currentId}
          depth={depth + 1}
          disabledIds={disabledIds}
          key={child.folderId}
          node={child}
          onSelect={onSelect}
          selectedId={selectedId}
        />
      ))}
    </>
  )
}

function PickerRow({
  depth,
  icon,
  isCurrent,
  isDisabled = false,
  isSelected,
  name,
  onSelect,
}: {
  depth: number
  icon: React.ReactNode
  isCurrent: boolean
  isDisabled?: boolean
  isSelected: boolean
  name: string
  onSelect: () => void
}) {
  return (
    <button
      aria-pressed={isSelected}
      className={cn(
        "flex min-w-0 items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-hidden hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        isSelected && "bg-accent text-accent-foreground"
      )}
      disabled={isDisabled}
      onClick={onSelect}
      style={{ paddingLeft: `${depth * 1.25 + 0.5}rem` }}
      type="button"
    >
      {icon}
      <span className="truncate">{name}</span>
      {isSelected ? (
        <Check aria-hidden className="ml-auto size-4 shrink-0" />
      ) : isCurrent ? (
        <span className="ml-auto shrink-0 text-muted-foreground text-xs">
          Current
        </span>
      ) : null}
    </button>
  )
}
