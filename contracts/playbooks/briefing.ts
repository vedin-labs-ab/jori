import { type PlaybookDefinition } from "./catalog"
import { digestDelivery } from "./delivery"
import { shiftClockTime } from "./schedule"

/** The planner leads the morning target by the default agent wait
 *  (15 minutes) plus synthesis and delivery margin. */
const scheduleLeadMinutes = 30

/** The one app-backed playbook: a scheduled planner that researches
 *  meetings into a template-provisioned app and protects delivery. */
export const meetingBriefing: PlaybookDefinition = {
  key: "meeting-briefing",
  template: "playbooks/briefing",
  version: 12,
  title: "Meeting Briefing",
  description:
    "Walk into important meetings with the context, questions, and decisions that will help you make the most of them.",
  scope: "personal",
  app: {
    title: "Meeting Briefing",
    description:
      "Stores your prepared briefings and powers the shareable briefing page.",
  },
  cadence: "Morning briefing or before each meeting",
  schedule: { repeat: "daily", time: "01:00" },
  setup: [
    {
      key: "meetings",
      kind: "fields",
      label: "Meetings",
      fields: [
        {
          key: "meetings",
          label: "Meetings",
          kind: "choice",
          default: "external",
          choices: [
            { value: "external", label: "External" },
            { value: "internal", label: "Internal" },
            { value: "both", label: "Both" },
          ],
        },
      ],
    },
    {
      key: "delivery-timing",
      kind: "behaviors",
      label: "Delivery timing",
      behaviors: [
        {
          key: "morning-briefing",
          label: "Morning briefing",
          description: "Relevant meetings in one daily digest",
          enabledBy: {
            key: "morning",
            label: "Morning briefing",
            kind: "boolean",
            default: true,
          },
          fields: [
            {
              key: "morningTime",
              label: "Send at",
              kind: "time",
              default: "07:30",
              enabledWhen: { key: "morning", value: true },
            },
          ],
        },
        {
          key: "before-meeting",
          label: "Before meetings",
          description: (options) =>
            options.morning === true
              ? "Resend the prepared dossier as a reminder"
              : "Prepare and send each dossier just in time",
          enabledBy: {
            key: "beforeMeeting",
            label: "Before meetings",
            kind: "boolean",
            default: false,
          },
          fields: [
            {
              key: "leadMinutes",
              label: "Send",
              kind: "choice",
              control: "select",
              default: "45",
              enabledWhen: { key: "beforeMeeting", value: true },
              choices: [
                { value: "15", label: "15 minutes before" },
                { value: "30", label: "30 minutes before" },
                { value: "45", label: "45 minutes before" },
                { value: "60", label: "60 minutes before" },
              ],
            },
          ],
        },
      ],
    },
  ],
  // The planning sweep starts early enough for per-meeting researchers to
  // finish before the morning briefing. Without it, the sweep plans early.
  resolveSchedule: (options) =>
    options.morning === true
      ? {
          repeat: "daily",
          time: shiftClockTime(
            String(options.morningTime),
            -scheduleLeadMinutes
          ),
        }
      : { repeat: "daily", time: "01:00" },
  describeCadence: (options) => {
    const morning =
      options.morning === true
        ? `Morning briefing at ${options.morningTime}`
        : ""
    const before =
      options.beforeMeeting === false
        ? ""
        : `${options.morning === true ? "briefing" : "Briefing"} ${options.leadMinutes} minutes before each meeting`

    return [morning, before].filter((part) => part !== "").join(", ")
  },
  validateOptions: (options) =>
    options.morning === false && options.beforeMeeting === false
      ? "Choose at least one delivery time."
      : undefined,
  slots: [
    { capability: "email", intents: ["read"] },
    { capability: "calendar", intents: ["read"] },
  ],
  delivery: {
    ...digestDelivery,
    slackTargets: ["dm"],
    noun: "briefing",
    style: "summary",
  },
  web: true,
}
