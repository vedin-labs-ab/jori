import {
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
import { type Automation } from "../types"

export function AutomationActions({
  isControlling,
  isDeleting,
  onDeleteRequest,
  onEdit,
  onPause,
  onResume,
  automation,
}: {
  isControlling: boolean
  isDeleting: boolean
  onDeleteRequest: () => void
  onEdit: (automation: Automation) => void
  onPause: (automation: Automation) => void
  onResume: (automation: Automation) => void
  automation: Automation
}) {
  const controlAction = automationControlAction(automation)

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
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuItem onSelect={() => onEdit(automation)}>
          <Pencil />
          Edit
        </DropdownMenuItem>
        {controlAction === "pause" ? (
          <DropdownMenuItem
            disabled={isControlling}
            onSelect={() => onPause(automation)}
          >
            {isControlling ? <Loader2 className="animate-spin" /> : <Pause />}
            {isControlling ? "Pausing" : "Pause"}
          </DropdownMenuItem>
        ) : null}
        {controlAction === "resume" ? (
          <DropdownMenuItem
            disabled={isControlling}
            onSelect={() => onResume(automation)}
          >
            {isControlling ? <Loader2 className="animate-spin" /> : <Play />}
            {isControlling ? "Resuming" : "Resume"}
          </DropdownMenuItem>
        ) : null}
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

function automationControlAction(automation: Automation) {
  if (automation.type === "once" || automation.status === "completed") {
    return undefined
  }

  return automation.status === "paused" ? "resume" : "pause"
}
