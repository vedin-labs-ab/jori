import { type PlaybookDefinition } from "./catalog"
import { type PlaybookOptionValues } from "./options"
import { type PlaybookSchedule } from "./schedule"

const weekdays = [
  { value: "monday", label: "Monday", weekday: 1 },
  { value: "tuesday", label: "Tuesday", weekday: 2 },
  { value: "wednesday", label: "Wednesday", weekday: 3 },
  { value: "thursday", label: "Thursday", weekday: 4 },
  { value: "friday", label: "Friday", weekday: 5 },
] as const

/** The flagship: an organization-scoped weekly pre-read assembled from the
 *  workstream memory. Organization principals hold no personal integrations,
 *  so the playbook declares no capability slots and delivers to a Slack
 *  channel, the one destination that belongs to the organization rather than
 *  to whoever enabled it. */
export const preread: PlaybookDefinition = {
  key: "preread",
  template: "playbooks/preread",
  version: 1,
  title: "Pre-read",
  description:
    "Walk into the sync already briefed: what moved, what stalled, and what shipped across your tools, with every line linked to where it came from.",
  scope: "organization",
  cadence: "Weekly, before the sync",
  schedule: { repeat: "weekly", weekday: 1, time: "06:30" },
  setup: [
    {
      key: "schedule",
      kind: "fields",
      label: "Schedule",
      fields: [
        {
          key: "weekday",
          label: "Day",
          kind: "choice",
          control: "select",
          default: "monday",
          choices: weekdays.map(({ value, label }) => ({ value, label })),
        },
        {
          key: "time",
          label: "Ready by",
          kind: "time",
          default: "06:30",
        },
      ],
    },
  ],
  resolveSchedule: (options) => prereadSchedule(options),
  describeCadence: (options) => {
    const schedule = prereadSchedule(options)

    return `${weekdayLabel(options)}s at ${schedule.time}`
  },
  slots: [],
  delivery: {
    allowed: ["slack"],
    slackTargets: ["channel"],
    noun: "pre-read",
  },
  web: false,
}

function prereadSchedule(options: PlaybookOptionValues): PlaybookSchedule {
  return {
    repeat: "weekly",
    weekday: chosenWeekday(options).weekday,
    time: String(options.time),
  }
}

function weekdayLabel(options: PlaybookOptionValues) {
  return chosenWeekday(options).label
}

function chosenWeekday(options: PlaybookOptionValues) {
  return (
    weekdays.find((weekday) => weekday.value === options.weekday) ?? weekdays[0]
  )
}
