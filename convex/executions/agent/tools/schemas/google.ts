import {
  artifactAttachmentsProperty,
  numberProperty,
  objectProperty,
  objectSchema,
  type SchemaMap,
  stringArrayProperty,
  stringProperty,
} from "./common"

export const googleToolInputSchemas = {
  google_gmail_search_threads: objectSchema({
    properties: {
      maxResults: numberProperty("Maximum threads to return.", 1, 50),
      q: stringProperty("Gmail search query."),
    },
  }),
  google_gmail_get_thread: gmailReadSchema("threadId"),
  google_gmail_get_message: gmailReadSchema("messageId"),
  google_gmail_reply_to_thread: objectSchema({
    required: ["threadId", "body"],
    properties: {
      body: stringProperty("Plain text reply body."),
      threadId: stringProperty("Gmail thread ID."),
    },
  }),
  google_gmail_send_message: gmailMessageSchema(),
  google_gmail_create_draft: gmailMessageSchema(),
  google_calendar_list_events: objectSchema({
    properties: {
      calendarId: stringProperty("Calendar ID. Defaults to primary."),
      maxResults: numberProperty("Maximum events to return.", 1, 50),
      orderBy: { type: "string", enum: ["startTime", "updated"] },
      q: stringProperty("Free text event search."),
      singleEvents: { type: "boolean" },
      timeMax: stringProperty("Exclusive upper bound RFC3339 timestamp."),
      timeMin: stringProperty("Inclusive lower bound RFC3339 timestamp."),
    },
  }),
  google_calendar_get_event: objectSchema({
    required: ["eventId"],
    properties: {
      calendarId: stringProperty("Calendar ID. Defaults to primary."),
      eventId: stringProperty("Google Calendar event ID."),
    },
  }),
  google_calendar_create_event: calendarWriteSchema(["event"]),
  google_calendar_update_event: calendarWriteSchema(["eventId", "event"], {
    eventId: stringProperty("Google Calendar event ID."),
  }),
  google_drive_search_files: objectSchema({
    properties: {
      corpora: {
        type: "string",
        enum: ["user", "domain", "drive", "allDrives"],
        description: "Drive corpus to search. Defaults to user.",
      },
      driveId: stringProperty("Shared drive ID when corpora is drive."),
      includeItemsFromAllDrives: {
        type: "boolean",
        description: "Include My Drive and shared drive files.",
      },
      includeTrashed: {
        type: "boolean",
        description: "Include trashed files. Defaults to false.",
      },
      orderBy: stringProperty("Drive sort expression."),
      pageSize: numberProperty("Maximum files to return.", 1, 100),
      pageToken: stringProperty("Token from a previous list response."),
      q: stringProperty("Drive files.list search query."),
      spaces: stringProperty("Comma-separated spaces. Defaults to drive."),
      supportsAllDrives: {
        type: "boolean",
        description: "Whether the app supports shared drives.",
      },
    },
  }),
  google_drive_get_file: driveFileSchema(),
  google_drive_read_file: objectSchema({
    required: ["fileId"],
    properties: {
      exportMimeType: stringProperty(
        "MIME type for exporting Google Workspace files. Defaults to text/plain."
      ),
      fileId: stringProperty("Google Drive file ID."),
      maxCharacters: numberProperty(
        "Maximum returned characters. Defaults to 200000.",
        1,
        200000
      ),
      supportsAllDrives: {
        type: "boolean",
        description: "Whether the app supports shared drives.",
      },
    },
  }),
  google_drive_create_file: driveWriteSchema(["name", "content"], {
    name: stringProperty("File name."),
    parents: stringArrayProperty("Parent folder IDs."),
  }),
  google_drive_update_file: driveWriteSchema(["fileId"], {
    fileId: stringProperty("Google Drive file ID."),
    name: stringProperty("New file name."),
  }),
} satisfies SchemaMap

function gmailMessageSchema() {
  return objectSchema({
    required: ["to", "subject", "body"],
    properties: {
      attachments: artifactAttachmentsProperty(),
      bcc: stringArrayProperty("BCC recipient email addresses."),
      body: stringProperty("Message body."),
      bodyType: {
        type: "string",
        enum: ["Text", "HTML"],
        description: "Defaults to Text.",
      },
      cc: stringArrayProperty("CC recipient email addresses."),
      subject: stringProperty("Message subject."),
      to: stringArrayProperty("Recipient email addresses."),
    },
  })
}

function gmailReadSchema(idProperty: string) {
  return objectSchema({
    required: [idProperty],
    properties: {
      [idProperty]: stringProperty("Gmail ID."),
      format: {
        type: "string",
        enum: ["full", "metadata", "minimal"],
        description: "Defaults to full.",
      },
    },
  })
}

function calendarWriteSchema(
  required: string[],
  properties: Record<string, unknown> = {}
) {
  return objectSchema({
    required,
    properties: {
      calendarId: stringProperty("Calendar ID. Defaults to primary."),
      event: objectProperty("Google Calendar event payload."),
      sendUpdates: {
        type: "string",
        enum: ["all", "externalOnly", "none"],
        description:
          "Whether attendees are emailed about the change. Defaults to none.",
      },
      ...properties,
    },
  })
}

function driveFileSchema() {
  return objectSchema({
    required: ["fileId"],
    properties: {
      fileId: stringProperty("Google Drive file ID."),
      supportsAllDrives: {
        type: "boolean",
        description: "Whether the app supports shared drives.",
      },
    },
  })
}

function driveWriteSchema(
  required: string[],
  properties: Record<string, unknown>
) {
  return objectSchema({
    required,
    properties: {
      content: stringProperty("File content."),
      mimeType: stringProperty("File MIME type. Defaults to text/plain."),
      supportsAllDrives: {
        type: "boolean",
        description: "Whether the app supports shared drives.",
      },
      ...properties,
    },
  })
}
