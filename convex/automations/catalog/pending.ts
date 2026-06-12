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
      label: "Email received",
      description: "Runs when a new Gmail message arrives.",
      message:
        "Gmail event delivery needs mailbox subscriptions before automations can run.",
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
      label: "Email received",
      description: "Runs when a new Outlook message arrives.",
      message:
        "Outlook Mail event delivery needs Microsoft Graph subscriptions before automations can run.",
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
      label: "Event created/updated",
      description: "Runs when an event is created or updated on a calendar.",
      message:
        "Google Calendar event delivery needs calendar subscriptions before automations can run.",
      parameters: [
        optionParameter("calendar", "Calendar", "Search calendars", {
          required: true,
          source: "googleCalendar.calendars",
        }),
      ],
    }),
    pendingEvent("event.starting_soon", {
      label: "Event starting soon",
      description: "Runs before a calendar event starts.",
      message:
        "Google Calendar starting-soon delivery needs scheduled calendar watchers before automations can run.",
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
      label: "Event created/updated",
      description: "Runs when an event is created or updated on a calendar.",
      message:
        "Microsoft Calendar event delivery needs Microsoft Graph subscriptions before automations can run.",
      parameters: [
        optionParameter("calendar", "Calendar", "Search calendars", {
          required: true,
          source: "microsoftCalendar.calendars",
        }),
      ],
    }),
    pendingEvent("event.starting_soon", {
      label: "Event starting soon",
      description: "Runs before a calendar event starts.",
      message:
        "Microsoft Calendar starting-soon delivery needs scheduled calendar watchers before automations can run.",
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
      description: "Runs when a selected Google Drive file changes.",
      message:
        "Google Drive event delivery needs Drive change subscriptions before automations can run.",
      parameters: [
        optionParameter("file", "File", "Search Drive files", {
          required: true,
          source: "googleDrive.files",
        }),
      ],
    }),
    pendingEvent("folder.file.created", {
      label: "File created in folder",
      description: "Runs when a file is created in a selected Drive folder.",
      message:
        "Google Drive folder event delivery needs Drive change subscriptions before automations can run.",
      parameters: [
        optionParameter("folder", "Folder", "Search Drive folders", {
          required: true,
          source: "googleDrive.folders",
        }),
        textParameter("mimeType", "MIME type", "application/pdf"),
      ],
    }),
  ]),
  provider("notion", [
    pendingEvent("page.updated", {
      label: "Page updated",
      description: "Runs when a selected Notion page changes.",
      message:
        "Notion page event delivery needs Notion webhook support before automations can run.",
      parameters: [
        optionParameter("page", "Page", "Search Notion pages", {
          required: true,
          source: "notion.pages",
        }),
      ],
    }),
    pendingEvent("data_source.item.changed", {
      label: "Database item created/updated",
      description:
        "Runs when an item is created or updated in a selected Notion data source.",
      message:
        "Notion data source event delivery needs Notion webhook support before automations can run.",
      parameters: [
        optionParameter("dataSource", "Data source", "Search data sources", {
          required: true,
          source: "notion.dataSources",
        }),
      ],
    }),
    pendingEvent("comment.created", {
      label: "Comment created",
      description: "Runs when a comment is created on a selected Notion page.",
      message:
        "Notion comment event delivery needs Notion webhook support before automations can run.",
      parameters: [
        optionParameter("page", "Page", "Search Notion pages", {
          required: true,
          source: "notion.pages",
        }),
      ],
    }),
  ]),
]
