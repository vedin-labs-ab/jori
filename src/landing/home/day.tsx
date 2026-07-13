import { type PlaybookCapability } from "@contracts/playbooks/capabilities"
import {
  type PlaybookDefinition,
  playbookCatalog,
} from "@contracts/playbooks/catalog"
import { resolvePlaybookOptions } from "@contracts/playbooks/options"
import { type PlaybookSchedule } from "@contracts/playbooks/schedule"
import { Mention, Section } from "../section"

// Sentence-case nouns for the meta line, keyed to the contracts so a new
// capability or delivery kind fails the build instead of going unlabeled.
const capabilityNouns = {
  calendar: "calendar",
  email: "email",
} satisfies Record<PlaybookCapability, string>

const weekdayPlurals = [
  "Sundays",
  "Mondays",
  "Tuesdays",
  "Wednesdays",
  "Thursdays",
  "Fridays",
  "Saturdays",
]

function repeatLabel(schedule: PlaybookSchedule) {
  if (schedule.repeat === "daily") {
    return "Daily"
  }

  return schedule.repeat === "weekdays"
    ? "Weekdays"
    : weekdayPlurals[schedule.weekday]
}

export function Day() {
  const rows = [...playbookCatalog].sort((left, right) =>
    deliveryTime(left).localeCompare(deliveryTime(right))
  )

  return (
    <Section
      id="day"
      lede="Playbooks handle the recurring work on a schedule. A mention covers everything else."
      title="A day with Milo"
    >
      <div className="divide-y border-y">
        {rows.map((definition) => (
          <PlaybookRow definition={definition} key={definition.key} />
        ))}
        <MentionRow />
      </div>
      <p className="mt-5 text-muted-foreground text-xs">
        Playbooks deliver by email or Slack. You choose where when you enable
        one.
      </p>
    </Section>
  )
}

// The ledger shows when output lands: Meeting Briefing sweeps early but delivers
// its digest at the configurable time option.
function deliveryTime(definition: PlaybookDefinition) {
  const time = resolvePlaybookOptions(definition.setup).morningTime

  return typeof time === "string" ? time : definition.schedule.time
}

function PlaybookRow({ definition }: { definition: PlaybookDefinition }) {
  const reads = definition.slots
    .map((slot) => capabilityNouns[slot.capability])
    .join(" and ")

  return (
    <div className="grid gap-x-8 gap-y-2 py-7 sm:grid-cols-[5.5rem_1fr]">
      <RowClock
        repeat={repeatLabel(definition.schedule)}
        time={deliveryTime(definition)}
      />
      <div>
        <h3 className="font-medium text-lg">{definition.title}</h3>
        <p className="mt-1.5 max-w-2xl text-muted-foreground text-sm leading-relaxed">
          {definition.description}
        </p>
        <p className="mt-3 text-muted-foreground text-xs">Reads {reads}</p>
      </div>
    </div>
  )
}

function MentionRow() {
  return (
    <div className="grid gap-x-8 gap-y-2 py-7 sm:grid-cols-[5.5rem_1fr]">
      <RowClock repeat="Anytime" time="@" />
      <div>
        <h3 className="flex flex-wrap items-center gap-x-1.5 font-medium text-lg">
          Mention <Mention /> in a thread
        </h3>
        <p className="mt-1.5 max-w-2xl text-muted-foreground text-sm leading-relaxed">
          Pull Milo into any Slack, GitHub, or Linear conversation and the work
          starts there: it gathers what the thread needs and reports back in
          place.
        </p>
        <p className="mt-3 text-muted-foreground text-xs">
          No schedule. That's the point.
        </p>
      </div>
    </div>
  )
}

function RowClock({ repeat, time }: { repeat: string; time: string }) {
  return (
    <p className="font-medium text-2xl tabular-nums tracking-tight sm:pt-0.5 sm:text-right">
      {time}
      <span className="mt-1 block font-normal text-muted-foreground text-xs">
        {repeat}
      </span>
    </p>
  )
}
