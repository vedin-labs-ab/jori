import {
  emailParameter,
  integration,
  numberParameter,
  optionParameter,
  pendingEvent,
} from "./builders"
import { type AutomationEventParameter } from "./types"

function pendingCalendarChangeEvents(args: {
  message: string
  parameters: readonly AutomationEventParameter[]
}) {
  return [
    pendingEvent("event.created", {
      label: "Calendar event created",
      description: "Runs when an event is created on the selected calendar.",
      message: args.message,
      parameters: args.parameters,
    }),
    pendingEvent("event.edited", {
      label: "Calendar event edited",
      description: "Runs when an event is edited on the selected calendar.",
      message: args.message,
      parameters: args.parameters,
    }),
  ]
}

const googleCalendarParameters = [
  optionParameter("calendar", "Calendar", "Search calendars", {
    required: true,
    source: "googleCalendar.calendars",
  }),
]

const microsoftCalendarParameters = [
  optionParameter("calendar", "Calendar", "Search calendars", {
    required: true,
    source: "microsoftCalendar.calendars",
  }),
]

export const pendingAutomationEventCatalog = [
  integration("gmail", [
    pendingEvent("message.received", {
      label: "New email",
      description: "Runs when a new Gmail message arrives.",
      message:
        "Gmail event-triggered jobs need mailbox subscriptions before they can run.",
      parameters: [
        optionParameter("label", "Label", "Search Gmail labels", {
          source: "gmail.labels",
          description: "Narrows runs to messages with the selected label.",
        }),
        emailParameter("from", "From", "person@example.com", {
          description: "Narrows runs to messages from this sender.",
        }),
      ],
    }),
  ]),
  integration("microsoftEmail", [
    pendingEvent("message.received", {
      label: "New email",
      description: "Runs when a new Outlook message arrives.",
      message:
        "Outlook Mail event-triggered jobs need Microsoft Graph subscriptions before they can run.",
      parameters: [
        optionParameter("folder", "Folder", "Search Outlook folders", {
          source: "microsoftEmail.folders",
          description: "Narrows runs to messages in the selected folder.",
        }),
        emailParameter("from", "From", "person@example.com", {
          description: "Narrows runs to messages from this sender.",
        }),
      ],
    }),
  ]),
  integration("googleCalendar", [
    ...pendingCalendarChangeEvents({
      message:
        "Google Calendar event-triggered jobs need calendar subscriptions before they can run.",
      parameters: googleCalendarParameters,
    }),
    pendingEvent("event.starting_soon", {
      label: "Event starting soon",
      description: "Runs before an event starts on the selected calendar.",
      message:
        "Google Calendar starting-soon jobs need scheduled calendar checks before they can run.",
      parameters: [
        ...googleCalendarParameters,
        numberParameter("leadMinutes", "Lead time", "15", {
          required: true,
          min: 1,
          max: 1440,
          step: 1,
          description: "Minutes before the event starts.",
        }),
      ],
    }),
  ]),
  integration("microsoftCalendar", [
    ...pendingCalendarChangeEvents({
      message:
        "Microsoft Calendar event-triggered jobs need Microsoft Graph subscriptions before they can run.",
      parameters: microsoftCalendarParameters,
    }),
    pendingEvent("event.starting_soon", {
      label: "Event starting soon",
      description: "Runs before an event starts on the selected calendar.",
      message:
        "Microsoft Calendar starting-soon jobs need scheduled calendar checks before they can run.",
      parameters: [
        ...microsoftCalendarParameters,
        numberParameter("leadMinutes", "Lead time", "15", {
          required: true,
          min: 1,
          max: 1440,
          step: 1,
          description: "Minutes before the event starts.",
        }),
      ],
    }),
  ]),
]
