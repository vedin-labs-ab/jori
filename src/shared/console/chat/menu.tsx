import { DropdownMenuContent } from "@/components/ui/dropdown-menu"
import { MaterialFilingItems } from "../materials/actions"
import { menuWidth } from "../menu"

export function ChatTitleMenu({
  onAccess,
  onMoveToFolder,
  onUnfile,
}: {
  onAccess: () => void
  onMoveToFolder: () => void
  onUnfile?: () => void
}) {
  return (
    <DropdownMenuContent align="start" className={menuWidth}>
      <MaterialFilingItems
        onAccess={onAccess}
        onMoveToFolder={onMoveToFolder}
        onUnfile={onUnfile}
      />
    </DropdownMenuContent>
  )
}
