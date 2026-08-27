import { type PlaybookDefinition } from "../contracts/playbooks/catalog"
import { digestDelivery } from "../contracts/playbooks/delivery"
import { shiftClockTime } from "../contracts/playbooks/schedule"

const scheduleLeadMinutes = 30

/** A test-only playbook exercising the full setup surface — a lone choice
 *  field, behavior toggles with dependent fields, cross-field validation,
 *  and option-driven scheduling — so the generic machinery stays covered
 *  without borrowing a catalog playbook. */
export const digestPlaybook: PlaybookDefinition = {
  key: "digest",
  template: "playbooks/digest",
  version: 1,
  title: "Daily Digest",
  description: "A focused digest of what changed, delivered on your terms.",
  scope: "personal",
  cadence: "Daily or on demand",
  schedule: { repeat: "daily", time: "01:00" },
  setup: [
    {
      key: "audience",
      kind: "fields",
      label: "Audience",
      fields: [
        {
          key: "audience",
          label: "Audience",
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
          key: "morning",
          label: "Morning digest",
          description: "Everything relevant in one daily digest",
          enabledBy: {
            key: "morning",
            label: "Morning digest",
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
          key: "reminders",
          label: "Reminders",
          description: (options) =>
            options.morning === true
              ? "Resend before each deadline"
              : "Send each item just in time",
          enabledBy: {
            key: "reminders",
            label: "Reminders",
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
              enabledWhen: { key: "reminders", value: true },
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
      options.morning === true ? `Morning digest at ${options.morningTime}` : ""
    const reminders =
      options.reminders === true
        ? `${options.morning === true ? "digest" : "Digest"} ${options.leadMinutes} minutes before each deadline`
        : ""

    return [morning, reminders].filter((part) => part !== "").join(", ")
  },
  validateOptions: (options) =>
    options.morning === false && options.reminders === false
      ? "Choose at least one delivery time."
      : undefined,
  slots: [
    { capability: "email", intents: ["read"] },
    { capability: "calendar", intents: ["read"] },
  ],
  jori: [],
  delivery: {
    ...digestDelivery,
    slackTargets: ["dm"],
    noun: "digest",
    style: "summary",
  },
  web: true,
}
