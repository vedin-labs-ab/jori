import {
  FolderInput,
  FolderMinus,
  Loader2,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { menuWidth } from "../../shared/menu"
import { type Automation, automationControlAction } from "../types"

// The canonical menu for an automation, as items only. Editing an
// automation edits all of it — schedule, instructions, access — so the item
// is plain "Edit" rather than the materials' "Edit details".

export type AutomationMenuActions = {
  isControlling: boolean
  isDeleting: boolean
  onDeleteRequest: () => void
  onEdit: (automation: Automation) => void
  onMoveToFolder: (automation: Automation) => void
  onPausedChange: (automation: Automation, paused: boolean) => void
  /** Folder listings only: unfiling acts on the filing, not the automation. */
  onUnfile?: (automation: Automation) => void
  automation: Automation
}

export function AutomationMenuItems({
  isControlling,
  isDeleting,
  onDeleteRequest,
  onEdit,
  onMoveToFolder,
  onPausedChange,
  onUnfile,
  automation,
}: AutomationMenuActions) {
  return (
    <>
      <DropdownMenuItem onSelect={() => onEdit(automation)}>
        <Pencil />
        Edit
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => onMoveToFolder(automation)}>
        <FolderInput />
        Move to folder…
      </DropdownMenuItem>
      {onUnfile === undefined ? null : (
        <DropdownMenuItem onSelect={() => onUnfile(automation)}>
          <FolderMinus />
          Remove from folder
        </DropdownMenuItem>
      )}
      <AutomationControlItem
        isControlling={isControlling}
        onPausedChange={onPausedChange}
        automation={automation}
      />
      <DropdownMenuSeparator />
      <DropdownMenuItem
        disabled={isDeleting}
        onSelect={onDeleteRequest}
        variant="destructive"
      >
        {isDeleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
        {isDeleting ? "Deleting" : "Delete"}
      </DropdownMenuItem>
    </>
  )
}

/** Pausing only means something for an automation with runs still ahead of
 *  it, so a one-off or a finished one offers nothing here. */
function AutomationControlItem({
  isControlling,
  onPausedChange,
  automation,
}: Pick<
  AutomationMenuActions,
  "isControlling" | "onPausedChange" | "automation"
>) {
  const controlAction = automationControlAction(automation)

  if (controlAction === undefined) {
    return null
  }

  const shouldPause = controlAction === "pause"
  const pendingLabel = shouldPause ? "Pausing" : "Resuming"
  const ControlIcon = shouldPause ? Pause : Play

  return (
    <DropdownMenuItem
      disabled={isControlling}
      onSelect={() => onPausedChange(automation, shouldPause)}
    >
      {isControlling ? <Loader2 className="animate-spin" /> : <ControlIcon />}
      {isControlling ? pendingLabel : shouldPause ? "Pause" : "Resume"}
    </DropdownMenuItem>
  )
}

/** The same menu on a list row, trigger and all. The confirmation the
 *  delete opens stays with the host, which knows what it deletes. */
export function AutomationRowMenu(props: AutomationMenuActions) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`Open actions for ${props.automation.name}`}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={menuWidth}>
        <AutomationMenuItems {...props} />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
