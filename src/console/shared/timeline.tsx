import { Clock } from "lucide-react"
import { type ReactNode } from "react"
import { ExpandableText } from "@/components/ui/expandable-text"
import { cn } from "@/lib/utils"
import { Paged } from "./paging"
import { absoluteTime, relativeTime } from "./time"

export type TimelineEntry = {
  id: string
  at: number
  content: ReactNode
}

// Standardized vertical timeline: circled clock markers on a connecting
// line, relative timestamps, clamped entry bodies, and built-in paging.
export function Timeline({
  entries,
  now,
  initialCount = 3,
  step = 5,
  maxLines = 2,
}: {
  entries: TimelineEntry[]
  now: number
  initialCount?: number
  step?: number
  maxLines?: number
}) {
  return (
    <Paged initialCount={initialCount} items={entries} step={step}>
      {(visible, hiddenCount) => (
        <ol className="flex flex-col">
          {visible.map((entry, index) => (
            <TimelineRow
              key={entry.id}
              continues={index < visible.length - 1 || hiddenCount > 0}
              entry={entry}
              maxLines={maxLines}
              now={now}
            />
          ))}
        </ol>
      )}
    </Paged>
  )
}

function TimelineRow({
  continues,
  entry,
  maxLines,
  now,
}: {
  continues: boolean
  entry: TimelineEntry
  maxLines: number
  now: number
}) {
  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full border text-muted-foreground">
          <Clock aria-hidden className="size-3" />
        </span>
        {continues ? <span className="mt-1 w-px grow bg-border" /> : null}
      </div>
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col gap-1",
          continues && "pb-4"
        )}
      >
        <span
          className="flex h-6 items-center text-muted-foreground text-xs"
          title={absoluteTime(entry.at)}
        >
          {relativeTime(entry.at, now)}
        </span>
        <div className="text-sm">
          <ExpandableText maxLines={maxLines}>{entry.content}</ExpandableText>
        </div>
      </div>
    </li>
  )
}
