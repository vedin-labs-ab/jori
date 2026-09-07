import { Fragment } from "react"
import { type MentionKind, mentionSigils } from "./scan"

export type SigilHint = { kind: MentionKind; label: string }

/** The sigils an editor answers to, each as its key and what it reaches:
 *  `@ integrations · / skills · # tools`. Quiet, for the edge of a field;
 *  named by `id` for a control that shows and hides it. */
export function SigilHints({
  hints,
  id,
}: {
  hints: readonly SigilHint[]
  id?: string
}) {
  return (
    <span className="flex min-w-0 items-center gap-2" id={id}>
      {hints.map((hint, index) => (
        <Fragment key={hint.kind}>
          {index === 0 ? null : <span aria-hidden="true">·</span>}
          <span className="inline-flex items-center gap-1">
            <kbd className="inline-flex h-4 min-w-4 items-center justify-center rounded-sm border bg-background px-1 font-medium font-mono text-[0.625rem]">
              {mentionSigils[hint.kind]}
            </kbd>
            {hint.label}
          </span>
        </Fragment>
      ))}
    </span>
  )
}
