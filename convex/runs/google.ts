import { type GoogleCredentials } from "../providers/google/credentials"
import { type ToolBundle } from "./tools"

export function createGoogleToolBundle(args: {
  accountEmail: string
  credentials: GoogleCredentials
}): ToolBundle {
  return {
    mcpServers: [
      {
        name: "google",
        command: "node",
        args: ["/tmp/milo-workspace/milo-google-mcp.mjs"],
        env: {
          MILO_GOOGLE_ACCESS_TOKEN: args.credentials.accessToken,
          MILO_GOOGLE_ACCOUNT_EMAIL: args.accountEmail,
        },
      },
    ],
    sandboxFiles: [
      {
        path: "/tmp/milo-workspace/milo-google-mcp.mjs",
        content: createGoogleProxyScript(),
      },
    ],
    preflights: [
      {
        type: "google",
        credentials: args.credentials,
      },
    ],
  }
}

export function createGoogleTokenPreflightCommand() {
  return googleTokenPreflightCommand
}

export function createGoogleProxyScript() {
  return googleProxyScript
}

const googleTokenPreflightCommand = [
  "node <<'NODE'",
  "async function main() {",
  "  const token = process.env.MILO_GOOGLE_ACCESS_TOKEN;",
  "  if (!token) {",
  "    throw new Error('Missing Google Workspace access token');",
  "  }",
  "  await verify('Gmail profile', 'https://gmail.googleapis.com/gmail/v1/users/me/profile');",
  "  const eventsUrl = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');",
  "  eventsUrl.searchParams.set('maxResults', '1');",
  "  eventsUrl.searchParams.set('timeMin', new Date().toISOString());",
  "  await verify('Google Calendar events', eventsUrl.toString());",
  "  console.log('Google Workspace token preflight passed');",
  "}",
  "",
  "async function verify(label, url) {",
  "  const response = await fetch(url, {",
  "    headers: { authorization: 'Bearer ' + process.env.MILO_GOOGLE_ACCESS_TOKEN },",
  "  });",
  "  const body = await response.json();",
  "  if (!response.ok) {",
  "    throw new Error(label + ' preflight failed: ' + JSON.stringify(body));",
  "  }",
  "}",
  "",
  "main().catch((error) => {",
  "  console.error(error);",
  "  process.exit(1);",
  "});",
  "NODE",
].join("\n")

const googleProxyScript = `
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

const accessToken = requiredEnv("MILO_GOOGLE_ACCESS_TOKEN");
const accountEmail = requiredEnv("MILO_GOOGLE_ACCOUNT_EMAIL");

const tools = [
  {
    name: "google_gmail_search_threads",
    description: "Search Gmail threads in the connected account.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        q: { type: "string" },
        maxResults: { type: "number" },
      },
    },
  },
  {
    name: "google_gmail_get_thread",
    description: "Read a Gmail thread from the connected account.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["threadId"],
      properties: {
        threadId: { type: "string" },
        format: { type: "string", enum: ["full", "metadata", "minimal"] },
      },
    },
  },
  {
    name: "google_gmail_get_message",
    description: "Read one Gmail message from the connected account.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["messageId"],
      properties: {
        messageId: { type: "string" },
        format: { type: "string", enum: ["full", "metadata", "minimal"] },
      },
    },
  },
  {
    name: "google_gmail_reply_to_thread",
    description: "Send a plain text reply to a Gmail thread in the connected account.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["threadId", "body"],
      properties: {
        threadId: { type: "string" },
        body: { type: "string" },
      },
    },
  },
  {
    name: "google_calendar_list_events",
    description: "List Google Calendar events for the connected account.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        calendarId: { type: "string" },
        timeMin: { type: "string" },
        timeMax: { type: "string" },
        q: { type: "string" },
        maxResults: { type: "number" },
        singleEvents: { type: "boolean" },
        orderBy: { type: "string", enum: ["startTime", "updated"] },
      },
    },
  },
  {
    name: "google_calendar_get_event",
    description: "Read one Google Calendar event for the connected account.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["eventId"],
      properties: {
        calendarId: { type: "string" },
        eventId: { type: "string" },
      },
    },
  },
  {
    name: "google_calendar_create_event",
    description: "Create a Google Calendar event for the connected account.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["event"],
      properties: {
        calendarId: { type: "string" },
        event: { type: "object", additionalProperties: true },
        sendUpdates: { type: "string", enum: ["all", "externalOnly", "none"] },
      },
    },
  },
  {
    name: "google_calendar_update_event",
    description: "Update a Google Calendar event for the connected account.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["eventId", "event"],
      properties: {
        calendarId: { type: "string" },
        eventId: { type: "string" },
        event: { type: "object", additionalProperties: true },
        sendUpdates: { type: "string", enum: ["all", "externalOnly", "none"] },
      },
    },
  },
];

const server = new Server(
  { name: "milo-google-workspace", version: "0.0.0" },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;
  const args = request.params.arguments ?? {};

  if (!tools.some((tool) => tool.name === toolName)) {
    throw new McpError(ErrorCode.InvalidParams, "Unknown Google Workspace tool: " + toolName);
  }

  const result = await callTool(toolName, args);

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
});

const transport = new StdioServerTransport();
await server.connect(transport);

async function callTool(toolName, args) {
  if (toolName === "google_gmail_search_threads") {
    return await searchGmailThreads(args);
  }

  if (toolName === "google_gmail_get_thread") {
    return await getGmailThread(getThreadId(args), normalizeGmailFormat(args.format));
  }

  if (toolName === "google_gmail_get_message") {
    return await getGmailMessage(args.messageId, normalizeGmailFormat(args.format));
  }

  if (toolName === "google_gmail_reply_to_thread") {
    if (typeof args.body !== "string" || args.body.trim() === "") {
      throw new McpError(ErrorCode.InvalidParams, "Reply body is required");
    }
    return await replyToGmailThread(getThreadId(args), args.body);
  }

  if (toolName === "google_calendar_list_events") {
    return await listCalendarEvents(args);
  }

  if (toolName === "google_calendar_get_event") {
    return await getCalendarEvent(args);
  }

  if (toolName === "google_calendar_create_event") {
    return await createCalendarEvent(args);
  }

  if (toolName === "google_calendar_update_event") {
    return await updateCalendarEvent(args);
  }

  throw new McpError(ErrorCode.InvalidParams, "Unknown Google Workspace tool: " + toolName);
}

async function searchGmailThreads(args) {
  const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/threads");
  url.searchParams.set("maxResults", String(normalizeMaxResults(args.maxResults)));

  if (typeof args.q === "string" && args.q.trim() !== "") {
    url.searchParams.set("q", args.q.trim());
  }

  return await googleJson(url.toString());
}

async function getGmailThread(threadId, format) {
  const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/threads/" + encodeURIComponent(threadId));
  url.searchParams.set("format", format);

  return await googleJson(url.toString());
}

async function getGmailMessage(messageId, format) {
  if (typeof messageId !== "string" || messageId === "") {
    throw new McpError(ErrorCode.InvalidParams, "messageId is required");
  }

  const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages/" + encodeURIComponent(messageId));
  url.searchParams.set("format", format);

  return await googleJson(url.toString());
}

function getThreadId(args) {
  if (typeof args.threadId !== "string" || args.threadId === "") {
    throw new McpError(ErrorCode.InvalidParams, "threadId is required");
  }

  return args.threadId;
}

async function replyToGmailThread(threadId, body) {
  const thread = await getGmailThread(threadId, "metadata");
  const messages = [...(thread.messages ?? [])].sort(
    (left, right) => Number(left.internalDate ?? 0) - Number(right.internalDate ?? 0),
  );
  const latestExternalMessage = [...messages].reverse().find((message) => {
    const from = parseOptionalEmailAddress(getHeader(message, "from"));
    return from !== undefined && from.toLowerCase() !== accountEmail.toLowerCase();
  });
  const latestMessage = latestExternalMessage ?? messages.at(-1);

  if (latestMessage === undefined) {
    throw new McpError(ErrorCode.InvalidParams, "Cannot reply to an empty Gmail thread");
  }

  const to = getReplyRecipient(latestMessage, latestExternalMessage !== undefined);
  const subject = ensureReplySubject(getHeader(latestMessage, "subject") ?? "");
  const messageId = getHeader(latestMessage, "message-id");
  const references = [getHeader(latestMessage, "references"), messageId]
    .filter(Boolean)
    .join(" ");
  const raw = createMimeMessage({
    to,
    subject,
    body,
    inReplyTo: messageId,
    references,
  });

  return await googleJson("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    body: {
      raw,
      threadId,
    },
  });
}

function getHeader(message, name) {
  return (message.payload?.headers ?? []).find(
    (header) => header.name?.toLowerCase() === name.toLowerCase(),
  )?.value;
}

function getReplyRecipient(message, isExternalMessage) {
  if (isExternalMessage) {
    return parseEmailAddress(getHeader(message, "from"));
  }

  const to = getHeader(message, "to");
  if (to !== undefined) {
    return parseEmailAddress(to);
  }

  return parseEmailAddress(getHeader(message, "from"));
}

function parseEmailAddress(value) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new McpError(ErrorCode.InvalidParams, "Cannot determine reply recipient");
  }

  return parseOptionalEmailAddress(value) ?? value;
}

function parseOptionalEmailAddress(value) {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }

  const match = value.match(/<([^>]+)>/);
  return match?.[1] ?? value.trim();
}

function ensureReplySubject(subject) {
  return /^re:/i.test(subject) ? subject : "Re: " + subject;
}

function createMimeMessage(args) {
  const headers = [
    ["To", args.to],
    ["Subject", args.subject],
    ["MIME-Version", "1.0"],
    ["Content-Type", "text/plain; charset=UTF-8"],
  ];

  if (args.inReplyTo) {
    headers.push(["In-Reply-To", args.inReplyTo]);
  }

  if (args.references) {
    headers.push(["References", args.references]);
  }

  const message = [
    ...headers.map(([name, value]) => name + ": " + value),
    "",
    args.body,
  ].join("\\r\\n");

  return Buffer.from(message, "utf8")
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

async function listCalendarEvents(args) {
  const calendarId = getCalendarId(args);
  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/" + encodeURIComponent(calendarId) + "/events");
  url.searchParams.set("maxResults", String(normalizeMaxResults(args.maxResults)));

  for (const key of ["timeMin", "timeMax", "q", "orderBy"]) {
    if (typeof args[key] === "string" && args[key] !== "") {
      url.searchParams.set(key, args[key]);
    }
  }

  if (typeof args.singleEvents === "boolean") {
    url.searchParams.set("singleEvents", String(args.singleEvents));
  }

  return await googleJson(url.toString());
}

async function getCalendarEvent(args) {
  const calendarId = getCalendarId(args);

  if (typeof args.eventId !== "string" || args.eventId === "") {
    throw new McpError(ErrorCode.InvalidParams, "eventId is required");
  }

  return await googleJson(
    "https://www.googleapis.com/calendar/v3/calendars/" +
      encodeURIComponent(calendarId) +
      "/events/" +
      encodeURIComponent(args.eventId),
  );
}

async function createCalendarEvent(args) {
  const calendarId = getCalendarId(args);

  if (typeof args.event !== "object" || args.event === null) {
    throw new McpError(ErrorCode.InvalidParams, "event is required");
  }

  const url = new URL("https://www.googleapis.com/calendar/v3/calendars/" + encodeURIComponent(calendarId) + "/events");
  addSendUpdates(url, args.sendUpdates);

  return await googleJson(url.toString(), {
    method: "POST",
    body: args.event,
  });
}

async function updateCalendarEvent(args) {
  const calendarId = getCalendarId(args);

  if (typeof args.eventId !== "string" || args.eventId === "") {
    throw new McpError(ErrorCode.InvalidParams, "eventId is required");
  }

  if (typeof args.event !== "object" || args.event === null) {
    throw new McpError(ErrorCode.InvalidParams, "event is required");
  }

  const url = new URL(
    "https://www.googleapis.com/calendar/v3/calendars/" +
      encodeURIComponent(calendarId) +
      "/events/" +
      encodeURIComponent(args.eventId),
  );
  addSendUpdates(url, args.sendUpdates);

  return await googleJson(url.toString(), {
    method: "PATCH",
    body: args.event,
  });
}

function getCalendarId(args) {
  return typeof args.calendarId === "string" && args.calendarId !== ""
    ? args.calendarId
    : "primary";
}

function addSendUpdates(url, value) {
  if (typeof value === "string" && value !== "") {
    url.searchParams.set("sendUpdates", value);
  }
}

function normalizeGmailFormat(value) {
  if (value === "metadata" || value === "minimal") {
    return value;
  }

  return "full";
}

function normalizeMaxResults(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 10;
  }

  return Math.max(1, Math.min(50, Math.round(value)));
}

async function googleJson(url, options = {}) {
  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      authorization: "Bearer " + accessToken,
      "content-type": "application/json",
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  const body = text === "" ? null : JSON.parse(text);

  if (!response.ok) {
    throw new McpError(
      ErrorCode.InternalError,
      "Google Workspace API request failed: " + JSON.stringify(body),
    );
  }

  return body;
}

function requiredEnv(name) {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error("Missing " + name);
  }
  return value;
}
`
