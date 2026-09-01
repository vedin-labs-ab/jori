import { useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { ChartNoAxesColumn } from "lucide-react"
import { Section, SectionGroup, SectionHeader } from "@/components/ui/section"
import { api } from "../../../../convex/_generated/api"
import { ConsoleEmptyState } from "../../shared/list/empty"
import { ConsoleListContent } from "../../shared/list/frame"
import { ConsoleListLoading } from "../../shared/list/loading"
import { UsageRunsChart } from "./chart"
import { UsageContributors, UsageFolders } from "./ranked"
import { UsageSpendSection } from "./spend"
import { UsageStats } from "./stats"
import { type UsageDays, type UsageOverview } from "./types"

// One Usage view serves both scopes. A folder shows its own subtree and
// drills into its subfolders; the organization shows every root folder and
// the unfiled bucket beside them. Only the copy differs.

/** What the window looked like and what it bought, side by side once the
 *  page is wide enough to read both at a glance. */
const chartPairClassName = "grid gap-4 md:gap-6 lg:grid-cols-2"

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
      {/* The band the page is really about, held above its own scroll: the
          window's figures and the control that sets them stay put while the
          detail below moves. */}
      <div className="border-b px-4 py-3 md:px-6">
        <UsageStats days={days} onDaysChange={onDaysChange} usage={usage} />
      </div>
      <ConsoleListContent>
        {usage === undefined ? (
          <ConsoleListLoading />
        ) : (
          <UsageBody
            days={days}
            folderId={folderId}
            organizationId={organizationId}
            usage={usage}
          />
        )}
        <UsageFootnote timezone={usage?.timezone} />
      </ConsoleListContent>
    </>
  )
}

function UsageBody({
  days,
  folderId,
  organizationId,
  usage,
}: {
  days: UsageDays
  folderId?: GenericId<"folders">
  organizationId: string
  usage: UsageOverview
}) {
  const scoped = folderId !== undefined

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
      <div className={chartPairClassName}>
        {/* Keyed by scope: sibling folders share this route, so without a
            remount a filter chosen in one would follow the reader into the
            next and quietly narrow a chart about somewhere else. */}
        <UsageSpendSection
          days={days}
          folderId={folderId}
          key={folderId ?? "organization"}
          organizationId={organizationId}
          usage={usage}
        />
        <Section className="min-w-0">
          <SectionHeader
            description="Runs that finished each day, with failures stacked on top."
            title="Runs"
          />
          <UsageRunsChart series={usage.series} />
        </Section>
      </div>
      <Section>
        <SectionHeader title="Automations" />
        <UsageContributors
          automations={usage.automations}
          total={usage.totals.micros}
        />
      </Section>
      <UsageFolderSection days={days} scoped={scoped} usage={usage} />
    </SectionGroup>
  )
}

/** The drill-down, when there is anywhere to drill into. */
function UsageFolderSection({
  days,
  scoped,
  usage,
}: {
  days: UsageDays
  scoped: boolean
  usage: UsageOverview
}) {
  if (usage.folders.length === 0 && (usage.unfiled?.micros ?? 0) === 0) {
    return null
  }

  return (
    <Section>
      <SectionHeader
        description="Each row covers everything filed below it."
        title={scoped ? "Subfolders" : "Folders"}
      />
      <UsageFolders
        days={days}
        folders={usage.folders}
        total={usage.totals.micros}
        unfiled={usage.unfiled}
      />
    </Section>
  )
}

/** States the two things a number here cannot state for itself: which day
 *  a day is, and what the money is a price for. */
function UsageFootnote({ timezone }: { timezone?: string }) {
  return (
    <p className="text-muted-foreground text-xs/relaxed">
      Days follow {timezone ?? "the organization's time zone"} · LLM usage
      priced at provider list rates.
    </p>
  )
}
