import { DropdownMenuContent } from "@/components/ui/dropdown-menu"
import { MaterialFilingItems } from "../materials/actions"
import { menuWidth } from "../menu"

/** The chat breadcrumb and filed rows use the same filing actions. */
export function ChatMenuItems({
  onAccess,
  onMove,
  onUnfile,
}: {
  onAccess: () => void
  onMove: () => void
  onUnfile?: () => void
}) {
  return (
    <MaterialFilingItems
      onAccess={onAccess}
      onMoveToFolder={onMove}
      onUnfile={onUnfile}
    />
  )
}

export function ChatTitleMenu({
  onAccess,
  onMove,
  onUnfile,
}: {
  onAccess: () => void
  onMove: () => void
  onUnfile?: () => void
}) {
  return (
    <DropdownMenuContent align="start" className={menuWidth}>
      <ChatMenuItems onAccess={onAccess} onMove={onMove} onUnfile={onUnfile} />
    </DropdownMenuContent>
  )
}
