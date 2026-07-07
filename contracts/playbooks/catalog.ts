import { type PlaybookSlot } from "./capabilities"
import { type PlaybookSchedule } from "./schedule"

export type PlaybookDefinition = {
  key: string
  title: string
  /** Outcome-first card copy: what the user gets, not how it works. */
  description: string
  schedule: PlaybookSchedule
  slots: readonly PlaybookSlot[]
  web: boolean
}

export const playbookCatalog: readonly PlaybookDefinition[] = [
  {
    key: "morning-brief",
    title: "Morning brief",
    description:
      "Start each day knowing what's ahead: today's meetings and the emails that actually need you, in one email before you sit down.",
    schedule: { repeat: "weekdays", time: "08:00" },
    slots: [
      { capability: "email", intents: ["read", "send"] },
      { capability: "calendar", intents: ["read"] },
    ],
    web: false,
  },
  {
    key: "meeting-prep",
    title: "Meeting prep",
    description:
      "Walk into every meeting prepared: who you're meeting, what it's about, and what to have ready — researched and emailed to you each morning.",
    schedule: { repeat: "weekdays", time: "07:30" },
    slots: [
      { capability: "email", intents: ["read", "send"] },
      { capability: "calendar", intents: ["read"] },
    ],
    web: true,
  },
  {
    key: "follow-up-sweep",
    title: "Follow-up sweep",
    description:
      "Nothing slips through: threads waiting on you get reply drafts ready to review, and you get a list of who still owes you an answer.",
    schedule: { repeat: "weekdays", time: "15:30" },
    slots: [{ capability: "email", intents: ["read", "draft", "send"] }],
    web: false,
  },
  {
    key: "week-in-review",
    title: "Week in review",
    description:
      "Close the week with a clear head: what happened, what's unresolved, and what next week looks like — one email every Friday afternoon.",
    schedule: { repeat: "weekly", weekday: 5, time: "16:00" },
    slots: [
      { capability: "email", intents: ["read", "send"] },
      { capability: "calendar", intents: ["read"] },
    ],
    web: false,
  },
]

export function getPlaybook(key: string) {
  const playbook = playbookCatalog.find((definition) => definition.key === key)

  if (playbook === undefined) {
    throw new Error("Unknown playbook.")
  }

  return playbook
}
