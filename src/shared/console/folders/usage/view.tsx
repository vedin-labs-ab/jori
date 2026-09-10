import { type GenericId } from "convex/values"
import { CalendarDays, ChartNoAxesColumn } from "lucide-react"
import { Section, SectionGroup, SectionHeader } from "@/components/ui/section"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { ConsoleHeaderActions } from "../../layout"
import { ConsoleEmptyState } from "../../list/empty"
import { ConsoleListContent } from "../../list/frame"
import { ConsoleListLoading } from "../../list/loading"
import { UsageCharts } from "./chart"
import { UsageContributors, UsageFolders } from "./ranked"
import { UsageStats } from "./stats"
import {
  parseUsageDays,
  type UsageDays,
  type UsageOverview,
  usageWindowOptions,
} from "./types"

// One Usage view serves both scopes. A folder shows its own subtree and
// drills into its subfolders; the organization shows every root folder and
// the unfiled bucket beside them. Only the copy differs. The figures arrive
// as a prop: the console queries them, and anything else hands them in.

export function UsageView({
  days,
  folderId,
  onDaysChange,
  usage,
}: {
  days: UsageDays
  /** Absent across the whole organization. */
  folderId?: GenericId<"folders">
  onDaysChange: (days: UsageDays) => void
  /** The window's figures, or nothing while they are still on their way. */
  usage: UsageOverview | undefined
}) {
  return (
    <>
      {/* The window sits in the header with the page's other controls, so
          the band below is figures alone. */}
      <ConsoleHeaderActions>
        <WindowSelect days={days} onDaysChange={onDaysChange} />
      </ConsoleHeaderActions>
      {/* The page reads its own width: the figures band and the charts
          divide against the room the view has, not the window's. */}
      <div className="@container/usage flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Held above the page's own scroll: the window's figures stay put
            while the detail below moves. */}
        <div className="border-b px-4 py-3 @3xl/inset:px-6">
          <UsageStats usage={usage} />
        </div>
        <ConsoleListContent>
          {usage === undefined ? (
            <ConsoleListLoading />
          ) : (
            <UsageBody days={days} folderId={folderId} usage={usage} />
          )}
        </ConsoleListContent>
      </div>
    </>
  )
}

function WindowSelect({
  days,
  onDaysChange,
}: {
  days: UsageDays
  onDaysChange: (days: UsageDays) => void
}) {
  return (
    <Select
      onValueChange={(value) => onDaysChange(parseUsageDays(Number(value)))}
      value={String(days)}
    >
      <SelectTrigger aria-label="Window">
        <CalendarDays className="text-muted-foreground" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {usageWindowOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function UsageBody({
  days,
  folderId,
  usage,
}: {
  days: UsageDays
  folderId?: GenericId<"folders">
  usage: UsageOverview
}) {
  const scoped = folderId !== undefined
  // A scope with nothing below it divides into itself alone, which is no
  // division; the charts still draw, in one colour.
  const hasFolders = usage.folders.some(
    (segment) => segment.folderId !== undefined
  )

  if (usage.totals.micros === 0 && usage.totals.ended === 0) {
    return (
      <ConsoleEmptyState
        description={
          scoped
            ? "Runs from jobs and chats filed here will show up as they spend."
            : "Runs from your jobs will show up here as they spend."
        }
        icon={ChartNoAxesColumn}
        title="No usage in this window"
      />
    )
  }

  return (
    <SectionGroup>
      <UsageCharts segments={usage.folders} series={usage.series} />
      {/* Who spent it and where it sits, side by side once the page is wide
          enough to read both at a glance — and the whole width when there
          is nowhere further down to point to. */}
      <div
        className={cn(
          "grid gap-4 md:gap-6",
          hasFolders && "@3xl/usage:grid-cols-2"
        )}
      >
        <Section className="min-w-0">
          <SectionHeader
            description="Each row is a job, or work asked for directly."
            title="Spend by source"
          />
          <UsageContributors jobs={usage.jobs} total={usage.totals.micros} />
        </Section>
        {hasFolders ? (
          <Section className="min-w-0">
            <SectionHeader
              description="Each row covers everything filed below it."
              title={scoped ? "Spend by subfolder" : "Spend by folder"}
            />
            <UsageFolders
              days={days}
              segments={usage.folders}
              total={usage.totals.micros}
            />
          </Section>
        ) : null}
      </div>
    </SectionGroup>
  )
}
