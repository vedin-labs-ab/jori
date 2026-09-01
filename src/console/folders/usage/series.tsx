import { useQuery } from "convex/react"
import { type GenericId } from "convex/values"
import { useState } from "react"
import { Section, SectionHeader } from "@/components/ui/section"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { api } from "../../../../convex/_generated/api"
import { UsageCharts } from "./chart"
import { type UsageDays, type UsageOverview, usageSlice } from "./types"

// The one part of the page worth narrowing: the days. The figures above
// stay about the whole scope — what the window cost, not what one
// automation cost — so the filter lives in this section's header and
// nowhere else, and both charts follow it together.

/** The unfiltered charts, which the overview already carries: choosing it
 *  asks the backend for nothing. */
const everything = "everything"

export function UsageSeriesSection({
  days,
  folderId,
  organizationId,
  usage,
}: {
  days: UsageDays
  /** The page's own scope, which every slice stays inside. Absent across
   *  the whole organization. */
  folderId?: GenericId<"folders">
  organizationId: string
  usage: UsageOverview
}) {
  const [choice, setChoice] = useState(everything)
  const slice = usageSlice(choice, usage)

  // A window the choice has fallen out of drops it for good rather than
  // holding it: coming back to the window it belonged to should find the
  // charts where the control says they are.
  if (choice !== everything && slice === undefined) {
    setChoice(everything)
  }

  const filtered = useQuery(
    api.folders.usage.series,
    slice === undefined
      ? "skip"
      : {
          organizationId,
          days,
          ...(folderId === undefined ? {} : { folderId }),
          ...slice,
        }
  )

  return (
    <Section className="min-w-0">
      <SectionHeader
        action={
          <SeriesFilter
            onValueChange={setChoice}
            scoped={folderId !== undefined}
            usage={usage}
            value={slice === undefined ? everything : choice}
          />
        }
        description="What each day cost, priced as the models charge, and the runs it bought."
        title="Spend and runs"
      />
      <UsageCharts
        series={slice === undefined ? usage.series : filtered?.series}
      />
    </Section>
  )
}

type FilterOption = { label: string; value: string }

/** The window's own contributors, in the order the tables below rank them.
 *  A deleted automation is not on offer: its spend is history, and there is
 *  nothing left to watch. */
function SeriesFilter({
  onValueChange,
  scoped,
  usage,
  value,
}: {
  onValueChange: (value: string) => void
  scoped: boolean
  usage: UsageOverview
  value: string
}) {
  const automations = usage.automations.flatMap((entry) =>
    entry.id === undefined ? [] : [{ label: entry.label, value: entry.id }]
  )
  const folders = usage.folders.map((folder) => ({
    label: folder.name,
    value: folder.folderId,
  }))

  if (automations.length === 0 && folders.length === 0) {
    return null
  }

  return (
    <Select onValueChange={onValueChange} value={value}>
      <SelectTrigger aria-label="Filter" className="w-36" size="sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end" className="max-w-72">
        <SelectGroup>
          <FilterItem label="Everything" value={everything} />
        </SelectGroup>
        <FilterGroup label="Automations" options={automations} />
        <FilterGroup
          label={scoped ? "Subfolders" : "Folders"}
          options={folders}
        />
      </SelectContent>
    </Select>
  )
}

function FilterGroup({
  label,
  options,
}: {
  label: string
  options: FilterOption[]
}) {
  if (options.length === 0) {
    return null
  }

  return (
    <SelectGroup>
      <SelectLabel>{label}</SelectLabel>
      {options.map((option) => (
        <FilterItem
          key={option.value}
          label={option.label}
          value={option.value}
        />
      ))}
    </SelectGroup>
  )
}

function FilterItem({ label, value }: FilterOption) {
  return (
    <SelectItem value={value}>
      <span className="min-w-0 truncate">{label}</span>
    </SelectItem>
  )
}
