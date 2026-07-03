import { CircleAlert } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { type Workstream } from "./types"

export function WorkstreamStatusCue({
  workstream,
}: {
  workstream: Workstream
}) {
  if (workstream.status === "confirmed") {
    return null
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          aria-label={workstream.statusLabel}
          className="inline-flex size-4 shrink-0 items-center justify-center text-warning/75"
          role="img"
        >
          <CircleAlert className="size-3.5" />
        </span>
      </TooltipTrigger>
      <TooltipContent>{workstream.statusLabel}</TooltipContent>
    </Tooltip>
  )
}
