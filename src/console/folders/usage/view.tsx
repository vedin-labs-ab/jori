import { useQuery } from "convex/react"
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
import { api } from "../../../../convex/_generated/api"
import { ConsoleHeaderActions } from "../../shared/layout"
import { ConsoleEmptyState } from "../../shared/list/empty"
import { ConsoleListContent } from "../../shared/list/frame"
import { ConsoleListLoading } from "../../shared/list/loading"
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
// the unfiled bucket beside them. Only the copy differs.

export function UsageView({
  days,
  folderId,
  onDaysChange,
  organizationId,
}: {
  days: UsageDays
  /** Absent across the whole organization. */
  folderId?: GenericId<"folders">
  onDaysChange: (days: UsageDays) => void
  organizationId: string
}) {
  const usage = useQuery(api.folders.usage.overview, {
    organizationId,
    days,
    ...(folderId === undefined ? {} : { folderId }),
  })

  return (
    <>
      {/* The window sits in the header with the page's other controls, so
          the band below is figures alone. */}
      <ConsoleHeaderActions>
        <WindowSelect days={days} onDaysChange={onDaysChange} />
      </ConsoleHeaderActions>
      {/* Held above the page's own scroll: the window's figures stay put
          while the detail below moves. */}
      <div className="border-b px-4 py-3 md:px-6">
        <UsageStats usage={usage} />
      </div>
      <ConsoleListContent>
        {usage === undefined ? (
          <ConsoleListLoading />
        ) : (
          <UsageBody days={days} folderId={folderId} usage={usage} />
        )}
      </ConsoleListContent>
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
            ? "Runs from automations filed here will show up as they spend."
            : "Runs from your automations will show up here as they spend."
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
        className={cn("grid gap-4 md:gap-6", hasFolders && "lg:grid-cols-2")}
      >
        <Section className="min-w-0">
          <SectionHeader
            description="Each row is an automation, or work asked for directly."
            title="Spend by source"
          />
          <UsageContributors
            automations={usage.automations}
            total={usage.totals.micros}
          />
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
