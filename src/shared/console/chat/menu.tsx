import { FolderInput, FolderMinus } from "lucide-react"
import {
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { menuWidth } from "../menu"

/** The chat breadcrumb and filed rows use the same filing actions. */
export function ChatFilingItems({
  onMove,
  onUnfile,
}: {
  onMove: () => void
  onUnfile?: () => void
}) {
  return (
    <>
      <DropdownMenuItem onSelect={onMove}>
        <FolderInput />
        Move to folder…
      </DropdownMenuItem>
      {onUnfile === undefined ? null : (
        <DropdownMenuItem onSelect={onUnfile}>
          <FolderMinus />
          Remove from folder
        </DropdownMenuItem>
      )}
    </>
  )
}

export function ChatTitleMenu({
  onMove,
  onUnfile,
}: {
  onMove: () => void
  onUnfile?: () => void
}) {
  return (
    <DropdownMenuContent align="start" className={menuWidth}>
      <ChatFilingItems onMove={onMove} onUnfile={onUnfile} />
    </DropdownMenuContent>
  )
}
