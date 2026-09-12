import { ArrowUpRight } from "lucide-react"
import { type ReactNode } from "react"
import { referenceDestination } from "../../references/presentation"
import { ConsoleLink } from "../../shell/link"
import { type ChatRun } from "../types"

// Under the turns, what a run did besides reply: quiet, in the thread's
// metadata voice, with the way to the run on the Activity page and
// nothing else to act on. The composer above stays open.

/** What became of a run that did not finish: that it stopped or failed,
 *  and the first line of why. */
export function RunNotice({ run }: { run: ChatRun }) {
  const reason = firstLine(run.error)

  return (
    <Notice runId={run.id}>
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
    </Notice>
  )
}

/** That the run condensed earlier context to keep going. */
export function CondensedNotice({ runId }: { runId: string }) {
  return (
    <Notice runId={runId}>
      <p className="font-medium">
        Jori condensed earlier context to keep going
      </p>
    </Notice>
  )
}

function Notice({ children, runId }: { children: ReactNode; runId: string }) {
  return (
    <div
      className="grid gap-1 pl-8 text-muted-foreground text-xs"
      role="status"
    >
      {children}
      <ConsoleLink
        className="inline-flex w-fit items-center gap-1 rounded-sm underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        {...referenceDestination({ kind: "run", id: runId })}
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
