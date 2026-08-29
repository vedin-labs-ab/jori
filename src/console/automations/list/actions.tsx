import {
  FolderInput,
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { type Automation, automationControlAction } from "../types"

export function AutomationActions({
  isControlling,
  isDeleting,
  onDeleteRequest,
  onEdit,
  onMoveToFolder,
  onPausedChange,
  automation,
}: {
  isControlling: boolean
  isDeleting: boolean
  onDeleteRequest: () => void
  onEdit: (automation: Automation) => void
  onMoveToFolder: (automation: Automation) => void
  onPausedChange: (automation: Automation, paused: boolean) => void
  automation: Automation
}) {
  const controlAction = automationControlAction(automation)
  const shouldPause = controlAction === "pause"
  const controlLabel = shouldPause
    ? isControlling
      ? "Pausing"
      : "Pause"
    : isControlling
      ? "Resuming"
      : "Resume"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`Open actions for ${automation.name}`}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onSelect={() => onEdit(automation)}>
          <Pencil />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onMoveToFolder(automation)}>
          <FolderInput />
          Move to folder…
        </DropdownMenuItem>
        {controlAction === undefined ? null : (
          <DropdownMenuItem
            disabled={isControlling}
            onSelect={() => onPausedChange(automation, shouldPause)}
          >
            {isControlling ? (
              <Loader2 className="animate-spin" />
            ) : shouldPause ? (
              <Pause />
            ) : (
              <Play />
            )}
            {controlLabel}
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          disabled={isDeleting}
          onSelect={onDeleteRequest}
          variant="destructive"
        >
          {isDeleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
          {isDeleting ? "Deleting" : "Delete"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
