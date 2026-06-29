import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemHeader,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { ActivityBadges, ActivityIcon, ActivityTime } from "./metadata"
import { type ActivityItem as ActivityItemType } from "./types"

export function ActivityItem({
  item,
  now,
}: {
  item: ActivityItemType
  now: number
}) {
  const hasDetails = item.details !== undefined && item.details.length > 0

  return (
    <Collapsible>
      <Item
        className="items-start border-border/60 bg-background/60"
        size="sm"
        variant="outline"
      >
        <ItemMedia>
          <ActivityIcon item={item} />
        </ItemMedia>
        <ItemContent className="min-w-0">
          <ItemHeader className="items-start">
            <div className="grid min-w-0 gap-1">
              <ItemTitle className="w-full max-w-full truncate">
                {item.title}
              </ItemTitle>
              {item.description === undefined ? null : (
                <ItemDescription className="line-clamp-2">
                  {item.description}
                </ItemDescription>
              )}
            </div>
            <ItemActions className="shrink-0">
              <ActivityBadges item={item} />
              {hasDetails ? (
                <CollapsibleTrigger asChild>
                  <Button
                    aria-label={`Toggle ${item.title} details`}
                    size="icon-xs"
                    type="button"
                    variant="ghost"
                  >
                    <ChevronDown />
                  </Button>
                </CollapsibleTrigger>
              ) : null}
            </ItemActions>
          </ItemHeader>
          <ActivityTime item={item} now={now} />
        </ItemContent>
        {hasDetails ? (
          <CollapsibleContent className="basis-full pl-6">
            <ActivityDetails item={item} />
          </CollapsibleContent>
        ) : null}
      </Item>
    </Collapsible>
  )
}

function ActivityDetails({ item }: { item: ActivityItemType }) {
  return (
    <dl className="grid gap-1.5 border-t pt-2 text-xs sm:grid-cols-[8rem_minmax(0,1fr)]">
      {item.details?.map((detail) => (
        <ActivityDetail
          key={`${detail.label}:${detail.value}`}
          label={detail.label}
          value={detail.value}
        />
      ))}
    </dl>
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
