import { ArrowUpRight } from "lucide-react"
import { ConsoleLink } from "../../shell/link"
import { referenceDestination } from "../presentation"
import { type ChatRun } from "../types"

/** Under the last turn, what became of a run that did not finish: that it
 *  stopped or failed, the first line of why, and the way to it on the
 *  Activity page. Quiet, in the thread's own metadata voice; the composer
 *  above it stays open. */
export function RunNotice({ run }: { run: ChatRun }) {
  const reason = firstLine(run.error)

  return (
    <div
      className="grid gap-1 pl-8 text-muted-foreground text-xs"
      role="status"
    >
      <p className="font-medium">
        {run.status === "stopped"
          ? "Jori stopped before finishing"
          : "Jori couldn't finish"}
      </p>
      {reason === undefined ? null : (
        <p className="truncate" title={run.error}>
          {reason}
        </p>
      )}
      <ConsoleLink
        className="inline-flex w-fit items-center gap-1 rounded-sm underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring/30"
        {...referenceDestination({ kind: "run", id: run.id })}
      >
        See the run in Activity
        <ArrowUpRight aria-hidden className="size-3" />
      </ConsoleLink>
    </div>
  )
}

function firstLine(text: string | undefined) {
  const line = text?.split("\n").find((candidate) => candidate.trim() !== "")

  return line?.trim()
}
