import { Clock } from "lucide-react"
import { type ReactNode } from "react"

// Compact vertical timeline: a muted marker column with a connecting line, a
// small time label, and free-form content per entry. Opinionated on look,
// agnostic about what an entry is.
export function Timeline({ children }: { children: ReactNode }) {
  return <ol className="flex flex-col">{children}</ol>
}

export function TimelineItem({
  time,
  children,
}: {
  time: string
  children: ReactNode
}) {
  return (
    <li className="group flex gap-3">
      <div className="flex flex-col items-center">
        <Clock className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
        <div className="my-1 w-px grow bg-border group-last:hidden" />
      </div>
      <div className="flex flex-col gap-0.5 pb-4 group-last:pb-0">
        <span className="text-muted-foreground text-xs">{time}</span>
        <div className="text-sm">{children}</div>
      </div>
    </li>
  )
}
