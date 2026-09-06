import { ChevronDown, Square } from "lucide-react"
import { type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Task, TaskContent, TaskLabel, TaskTrigger } from "../task"

/** The status line of Jori's turn while the run works: the label, what
 *  the run is doing folded under it, and the control that stops it. It
 *  sits inside the turn, under the mark, above whatever of the reply has
 *  arrived. The host fills `progress` with the run's log; without it the
 *  line is the label alone. */
export function ChatWorking({
  onStop,
  progress,
}: {
  onStop: () => void
  progress?: ReactNode
}) {
  return (
    <div className="min-w-0" role="status">
      <Task defaultOpen={false}>
        <div className="flex min-h-7 items-center gap-2">
          {progress === undefined ? (
            <TaskLabel className="text-sm" shimmer>
              Working
            </TaskLabel>
          ) : (
            <TaskTrigger title="Working">
              <button
                className="flex cursor-pointer items-center gap-1 rounded-sm text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                type="button"
              >
                <TaskLabel shimmer>Working</TaskLabel>
                <ChevronDown
                  aria-hidden="true"
                  className="size-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
                />
              </button>
            </TaskTrigger>
          )}
          <Button
            className="ml-auto"
            onClick={onStop}
            size="xs"
            type="button"
            variant="ghost"
          >
            <Square className="fill-current" data-icon="inline-start" />
            Stop
          </Button>
        </div>
        {progress === undefined ? null : <TaskContent>{progress}</TaskContent>}
      </Task>
    </div>
  )
}
