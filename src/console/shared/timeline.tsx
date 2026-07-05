import { Clock } from "lucide-react"
import { type ReactNode } from "react"
import { ExpandableText } from "@/components/ui/expandable-text"
import { cn } from "@/lib/utils"
import { absoluteTime, relativeTime } from "./time"

// Standardized vertical timeline row: a circled clock marker on a connecting
// line, an optional label beside the relative timestamp, a clamped body, and
// an optional details block below the clamp (receipts, attachments).
export function TimelineRow({
  at,
  now,
  continues,
  label,
  children,
  details,
  maxLines = 2,
}: {
  at: number
  now: number
  continues: boolean
  label?: ReactNode
  children: ReactNode
  details?: ReactNode
  maxLines?: number
}) {
  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full border text-muted-foreground">
          <Clock aria-hidden className="size-3" />
        </span>
        {continues ? <span className="w-px grow bg-border" /> : null}
      </div>
      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col gap-1",
          continues && "pb-4"
        )}
      >
        <span className="flex h-6 min-w-0 items-center gap-2">
          {label}
          <span
            className="shrink-0 text-muted-foreground text-xs"
            title={absoluteTime(at)}
          >
            {relativeTime(at, now)}
          </span>
        </span>
        <div className="text-sm">
          <ExpandableText maxLines={maxLines}>{children}</ExpandableText>
        </div>
        {details}
      </div>
    </li>
  )
}
