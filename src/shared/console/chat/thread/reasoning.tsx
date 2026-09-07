import { ChevronDown } from "lucide-react"
import { useId, useState } from "react"
import { cn } from "@/lib/utils"
import { TaskLabel } from "../../task"

/**
 * What the model is thinking, while it thinks: quiet, under the working
 * row, showing the last few lines as they stream and the whole on request.
 * Once the reply's text starts the thinking folds to its line alone, still
 * there to open, and the reply takes over. Plain text throughout; the
 * reasoning is the model's notes, not its message.
 */
export function ChatReasoning({
  settled,
  text,
}: {
  /** The reply's text has started, so the thinking is done. */
  settled: boolean
  text: string
}) {
  const [expanded, setExpanded] = useState(false)
  const id = useId()
  const showsTail = !(expanded || settled)

  return (
    <div className="min-w-0 text-muted-foreground text-xs">
      <button
        aria-controls={id}
        aria-expanded={expanded}
        className="flex min-h-6 cursor-pointer items-center gap-1 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
        onClick={() => setExpanded((open) => !open)}
        type="button"
      >
        <TaskLabel shimmer={!settled}>
          {settled ? "Thought" : "Thinking"}
        </TaskLabel>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "size-3 transition-transform",
            expanded ? "rotate-180" : null
          )}
        />
      </button>
      {expanded || showsTail ? (
        <div
          className={cn(
            "mt-1 flex flex-col justify-end",
            showsTail ? "max-h-12 overflow-hidden" : null
          )}
          id={id}
        >
          <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
            {text}
          </p>
        </div>
      ) : null}
    </div>
  )
}
