import {
  emailParameter,
  numberParameter,
  optionParameter,
  pendingEvent,
  provider,
  textParameter,
} from "./builders"

export const pendingAutomationEventCatalog = [
  provider("gmail", [
    pendingEvent("message.received", {
      label: "New email",
      description: "Runs when a new Gmail message arrives.",
      message:
        "Gmail event-triggered automations need mailbox subscriptions before they can run.",
      parameters: [
        optionParameter("label", "Label", "Search Gmail labels", {
          source: "gmail.labels",
        }),
        emailParameter("from", "From", "person@example.com"),
      ],
    }),
  ]),
  provider("microsoftEmail", [
    pendingEvent("message.received", {
      label: "New email",
      description: "Runs when a new Outlook message arrives.",
      message:
        "Outlook Mail event-triggered automations need Microsoft Graph subscriptions before they can run.",
      parameters: [
        optionParameter("folder", "Folder", "Search Outlook folders", {
          source: "microsoftEmail.folders",
        }),
        emailParameter("from", "From", "person@example.com"),
      ],
    }),
  ]),
  provider("googleCalendar", [
    pendingEvent("event.changed", {
      label: "Calendar event created or updated",
      description:
        "Runs when an event is created or updated on the selected calendar.",
      message:
        "Google Calendar event-triggered automations need calendar subscriptions before they can run.",
      parameters: [
        optionParameter("calendar", "Calendar", "Search calendars", {
          required: true,
          source: "googleCalendar.calendars",
        }),
      ],
    }),
    pendingEvent("event.starting_soon", {
      label: "Event starting soon",
      description: "Runs before an event starts on the selected calendar.",
      message:
        "Google Calendar starting-soon automations need scheduled calendar checks before they can run.",
      parameters: [
        optionParameter("calendar", "Calendar", "Search calendars", {
          required: true,
          source: "googleCalendar.calendars",
        }),
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
  provider("microsoftCalendar", [
    pendingEvent("event.changed", {
      label: "Calendar event created or updated",
      description:
        "Runs when an event is created or updated on the selected calendar.",
      message:
        "Microsoft Calendar event-triggered automations need Microsoft Graph subscriptions before they can run.",
      parameters: [
        optionParameter("calendar", "Calendar", "Search calendars", {
          required: true,
          source: "microsoftCalendar.calendars",
        }),
      ],
    }),
    pendingEvent("event.starting_soon", {
      label: "Event starting soon",
      description: "Runs before an event starts on the selected calendar.",
      message:
        "Microsoft Calendar starting-soon automations need scheduled calendar checks before they can run.",
      parameters: [
        optionParameter("calendar", "Calendar", "Search calendars", {
          required: true,
          source: "microsoftCalendar.calendars",
        }),
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
  provider("googleDrive", [
    pendingEvent("file.updated", {
      label: "File updated",
      description: "Runs when the selected Google Drive file changes.",
      message:
        "Google Drive event-triggered automations need Drive change subscriptions before they can run.",
      parameters: [
        optionParameter("file", "File", "Search Drive files", {
          required: true,
          source: "googleDrive.files",
        }),
      ],
    }),
    pendingEvent("folder.file.created", {
      label: "File added to folder",
      description: "Runs when a file is created in the selected Drive folder.",
      message:
        "Google Drive folder automations need Drive change subscriptions before they can run.",
      parameters: [
        optionParameter("folder", "Folder", "Search Drive folders", {
          required: true,
          source: "googleDrive.folders",
        }),
        textParameter("mimeType", "MIME type", "application/pdf"),
      ],
    }),
  ]),
]
