import { useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { Coins } from "lucide-react"
import { Section, SectionGroup, SectionHeader } from "@/components/ui/section"
import { api } from "../../../../convex/_generated/api"
import { ConsoleEmptyState } from "../../shared/list/empty"
import { ConsoleListContent } from "../../shared/list/frame"
import { ConsoleListLoading } from "../../shared/list/loading"
import { UsageRunsChart, UsageSpendChart } from "./chart"
import { UsageContributors, UsageFolders } from "./ranked"
import { UsageStats } from "./stats"
import { type UsageDays, type UsageOverview } from "./types"

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
            scoped={folderId !== undefined}
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
  scoped,
  usage,
}: {
  days: UsageDays
  scoped: boolean
  usage: UsageOverview
}) {
  if (usage.totals.micros === 0 && usage.totals.ended === 0) {
    return (
      <ConsoleEmptyState
        description={
          scoped
            ? "Runs from automations filed here will show up as they spend."
            : "Runs from your automations will show up here as they spend."
        }
        icon={Coins}
        title="No usage in this window"
      />
    )
  }

  return (
    <SectionGroup>
      <Section>
        <SectionHeader
          description="What each day cost, priced as the models charge."
          title="Spend over time"
        />
        <UsageSpendChart series={usage.series} />
      </Section>
      <Section>
        <SectionHeader
          description="Runs that finished each day, with failures stacked on top."
          title="Runs"
        />
        <UsageRunsChart series={usage.series} />
      </Section>
      <Section>
        <SectionHeader title="Top automations" />
        <UsageContributors automations={usage.automations} rest={usage.rest} />
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
