import { ChevronDown } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  RunRowBody,
  RunRowContent,
  RunRowControl,
  RunRowFrame,
  RunRowHeader,
  RunRowMeta,
} from "../row/layout"
import { ActivityBadges, ActivityIcon, ActivityTime } from "./metadata"
import { type ActivityItem as ActivityItemType } from "./types"

export function ActivityItem({
  item,
  now,
}: {
  item: ActivityItemType
  now: number
}) {
  const [isOpen, setIsOpen] = useState(false)
  const hasDetails = item.details !== undefined && item.details.length > 0

  return (
    <RunRowFrame className="bg-background/80">
      <RunRowHeader>
        <RunRowControl
          onClick={
            hasDetails ? () => setIsOpen((current) => !current) : undefined
          }
        >
          <ActivityIcon item={item} />
          <RunRowContent title={item.title}>
            {item.description === undefined ? null : (
              <p className="line-clamp-2 text-muted-foreground text-xs/relaxed">
                {item.description}
              </p>
            )}
            <ActivityTime item={item} now={now} />
          </RunRowContent>
          <RunRowMeta className="items-center gap-2">
            <ActivityBadges item={item} />
            {hasDetails ? (
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  "size-4 shrink-0 text-muted-foreground transition-transform duration-150",
                  isOpen && "rotate-180"
                )}
              />
            ) : null}
          </RunRowMeta>
        </RunRowControl>
      </RunRowHeader>
      {isOpen && hasDetails ? (
        <RunRowBody>
          <ActivityDetails item={item} />
        </RunRowBody>
      ) : null}
    </RunRowFrame>
  )
}

function ActivityDetails({ item }: { item: ActivityItemType }) {
  return (
    <div className="border-t px-3 py-3">
      <dl className="grid gap-1.5 text-xs sm:grid-cols-[8rem_minmax(0,1fr)]">
        {item.details?.map((detail) => (
          <ActivityDetail
            key={`${detail.label}:${detail.value}`}
            label={detail.label}
            value={detail.value}
          />
        ))}
      </dl>
    </div>
  )
}

function ActivityDetail({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words font-mono text-foreground">{value}</dd>
    </>
  )
}
