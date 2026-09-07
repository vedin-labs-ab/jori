import { ChevronDown } from "lucide-react"
import { type ReactNode } from "react"
import { Task, TaskContent, TaskLabel, TaskTrigger } from "../task"

/** The status line of Jori's turn while the run works: the label, and
 *  what the run is doing folded under it. It sits inside the turn, under
 *  the mark, above whatever of the reply has arrived; the composer's
 *  control is the one that stops the run. The host fills `progress` with
 *  the run's log; without it the line is the label alone. Only the label
 *  is announced: the log under it changes too often to read aloud. */
export function ChatWorking({ progress }: { progress?: ReactNode }) {
  const label = (
    <TaskLabel role="status" shimmer>
      Working
    </TaskLabel>
  )

  return (
    <div className="min-w-0">
      <Task defaultOpen={false}>
        <div className="flex min-h-6 items-center gap-2 text-sm">
          {progress === undefined ? (
            label
          ) : (
            <TaskTrigger title="Working">
              <button
                className="flex cursor-pointer items-center gap-1 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                type="button"
              >
                {label}
                <ChevronDown
                  aria-hidden="true"
                  className="size-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180"
                />
              </button>
            </TaskTrigger>
          )}
        </div>
        {progress === undefined ? null : <TaskContent>{progress}</TaskContent>}
      </Task>
    </div>
  )
}
