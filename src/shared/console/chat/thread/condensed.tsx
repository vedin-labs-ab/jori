import { ArrowUpRight } from "lucide-react"
import { ConsoleLink } from "../../shell/link"
import { referenceDestination } from "../presentation"

/** Under the turns, that the run condensed earlier context to keep going,
 *  and the way to it on the Activity page. Same family as `RunNotice`:
 *  quiet, in the thread's metadata voice, with nothing to act on. */
export function CondensedNotice({ runId }: { runId: string }) {
  return (
    <div
      className="grid gap-1 pl-8 text-muted-foreground text-xs"
      role="status"
    >
      <p className="font-medium">
        Jori condensed earlier context to keep going
      </p>
      <ConsoleLink
        className="inline-flex w-fit items-center gap-1 rounded-sm underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring/30"
        {...referenceDestination({ kind: "run", id: runId })}
      >
        See the run in Activity
        <ArrowUpRight aria-hidden className="size-3" />
      </ConsoleLink>
    </div>
  )
}
