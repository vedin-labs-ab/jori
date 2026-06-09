export function createMicrosoftGraphMcpScript() {
  return microsoftGraphMcpScript
}

const microsoftGraphMcpScript = `
import { Client } from "@microsoft/microsoft-graph-client";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

const accessToken = requiredEnv("MILO_MICROSOFT_ACCESS_TOKEN");
const microsoftSurface = requiredEnv("MILO_MICROSOFT_SURFACE");

const client = Client.init({
  authProvider: (done) => done(null, accessToken),
});

const emailTools = [
  {
    name: "microsoft_email_search_messages",
    description: "Search or list recent Outlook messages in the connected Microsoft account.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        q: { type: "string" },
        folderId: { type: "string" },
        top: { type: "number" },
      },
    },
  },
  {
    name: "microsoft_email_get_message",
    description: "Read one Outlook message from the connected Microsoft account.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["messageId"],
      properties: {
        messageId: { type: "string" },
      },
    },
  },
  {
    name: "microsoft_email_send_message",
    description: "Send a new Outlook email from the connected Microsoft account.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["subject", "body", "to"],
      properties: {
        subject: { type: "string" },
        body: { type: "string" },
        bodyType: { type: "string", enum: ["Text", "HTML"] },
        to: { type: "array", items: { type: "string" } },
        cc: { type: "array", items: { type: "string" } },
        bcc: { type: "array", items: { type: "string" } },
        saveToSentItems: { type: "boolean" },
      },
    },
  },
  {
    name: "microsoft_email_create_draft",
    description: "Create an Outlook draft message in the connected Microsoft account.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["subject", "body", "to"],
      properties: {
        subject: { type: "string" },
        body: { type: "string" },
        bodyType: { type: "string", enum: ["Text", "HTML"] },
        to: { type: "array", items: { type: "string" } },
        cc: { type: "array", items: { type: "string" } },
        bcc: { type: "array", items: { type: "string" } },
      },
    },
  },
  {
    name: "microsoft_email_update_message",
    description: "Update an Outlook message or draft in the connected Microsoft account.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["messageId", "message"],
      properties: {
        messageId: { type: "string" },
        message: { type: "object", additionalProperties: true },
      },
    },
  },
];

const calendarTools = [
  {
    name: "microsoft_calendar_list_events",
    description: "List Microsoft Calendar events for the connected account.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        timeMin: { type: "string" },
        timeMax: { type: "string" },
        top: { type: "number" },
      },
    },
  },
  {
    name: "microsoft_calendar_get_event",
    description: "Read one Microsoft Calendar event from the connected account.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["eventId"],
      properties: {
        eventId: { type: "string" },
      },
    },
  },
  {
    name: "microsoft_calendar_create_event",
    description: "Create a Microsoft Calendar event in the connected account.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["event"],
      properties: {
        event: { type: "object", additionalProperties: true },
        sendUpdates: { type: "string", enum: ["all", "none"] },
      },
    },
  },
  {
    name: "microsoft_calendar_update_event",
    description: "Update a Microsoft Calendar event in the connected account.",
    inputSchema: {
      type: "object",
      additionalProperties: false,
      required: ["eventId", "event"],
      properties: {
        eventId: { type: "string" },
        event: { type: "object", additionalProperties: true },
        sendUpdates: { type: "string", enum: ["all", "none"] },
      },
    },
  },
];

const tools = filterEnabledTools(microsoftSurface === "microsoftEmail" ? emailTools : calendarTools);

const server = new Server(
  { name: "milo-microsoft", version: "0.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;
  const args = request.params.arguments ?? {};

  if (!tools.some((tool) => tool.name === toolName)) {
    throw new McpError(ErrorCode.InvalidParams, "Unknown Microsoft tool: " + toolName);
  }

  if (microsoftSurface === "microsoftEmail") {
    return await handleEmailTool(toolName, args);
  }

  if (microsoftSurface === "microsoftCalendar") {
    return await handleCalendarTool(toolName, args);
  }

  throw new McpError(ErrorCode.InvalidParams, "Unknown Microsoft surface: " + microsoftSurface);
});

async function handleEmailTool(toolName, args) {
  if (toolName === "microsoft_email_search_messages") {
    const top = normalizeTop(args.top, 10, 25);
    const folderPath = requiredOptionalString(args.folderId) === undefined
      ? "/me/messages"
      : "/me/mailFolders/" + encodeURIComponent(args.folderId) + "/messages";
    const request = client.api(folderPath).top(top);

    if (typeof args.q === "string" && args.q.trim() !== "") {
      request.search('"' + args.q.replace(/"/g, '\\"') + '"');
    } else {
      request.orderby("receivedDateTime desc");
    }

    return jsonContent(await request.get());
  }

  if (toolName === "microsoft_email_get_message") {
    return jsonContent(await client.api("/me/messages/" + encodeURIComponent(requiredString(args.messageId, "messageId"))).get());
  }

  if (toolName === "microsoft_email_send_message") {
    await client.api("/me/sendMail").post({
      message: buildMessage(args),
      saveToSentItems: args.saveToSentItems !== false,
    });
    return textContent("sent");
  }

  if (toolName === "microsoft_email_create_draft") {
    return jsonContent(await client.api("/me/messages").post(buildMessage(args)));
  }

  if (toolName === "microsoft_email_update_message") {
    return jsonContent(
      await client
        .api("/me/messages/" + encodeURIComponent(requiredString(args.messageId, "messageId")))
        .patch(requiredObject(args.message, "message"))
    );
  }

  throw new McpError(ErrorCode.InvalidParams, "Unknown Microsoft Email tool: " + toolName);
}

async function handleCalendarTool(toolName, args) {
  if (toolName === "microsoft_calendar_list_events") {
    const top = normalizeTop(args.top, 10, 50);

    if (typeof args.timeMin === "string" || typeof args.timeMax === "string") {
      const timeMin = typeof args.timeMin === "string" ? args.timeMin : new Date().toISOString();
      const timeMax = typeof args.timeMax === "string" ? args.timeMax : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      return jsonContent(
        await client
          .api("/me/calendarView")
          .query({ startDateTime: timeMin, endDateTime: timeMax })
          .top(top)
          .orderby("start/dateTime")
          .get()
      );
    }

    return jsonContent(await client.api("/me/events").top(top).orderby("start/dateTime").get());
  }

  if (toolName === "microsoft_calendar_get_event") {
    return jsonContent(await client.api("/me/events/" + encodeURIComponent(requiredString(args.eventId, "eventId"))).get());
  }

  if (toolName === "microsoft_calendar_create_event") {
    let request = client.api("/me/events");
    if (args.sendUpdates === "all" || args.sendUpdates === "none") {
      request = request.query({ sendUpdates: args.sendUpdates });
    }
    return jsonContent(await request.post(requiredObject(args.event, "event")));
  }

  if (toolName === "microsoft_calendar_update_event") {
    let request = client.api("/me/events/" + encodeURIComponent(requiredString(args.eventId, "eventId")));
    if (args.sendUpdates === "all" || args.sendUpdates === "none") {
      request = request.query({ sendUpdates: args.sendUpdates });
    }
    return jsonContent(await request.patch(requiredObject(args.event, "event")));
  }

  throw new McpError(ErrorCode.InvalidParams, "Unknown Microsoft Calendar tool: " + toolName);
}

function buildMessage(args) {
  return {
    subject: requiredString(args.subject, "subject"),
    body: {
      contentType: args.bodyType === "HTML" ? "HTML" : "Text",
      content: requiredString(args.body, "body"),
    },
    toRecipients: recipients(requiredStringArray(args.to, "to")),
    ccRecipients: recipients(optionalStringArray(args.cc)),
    bccRecipients: recipients(optionalStringArray(args.bcc)),
  };
}

function recipients(addresses) {
  return addresses.map((address) => ({ emailAddress: { address } }));
}

function normalizeTop(value, fallback, max) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(1, Math.min(Math.floor(value), max));
}

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error("Missing " + name);
  }
  return value;
}

function filterEnabledTools(allTools) {
  const enabledTools = readEnabledTools();

  if (enabledTools === undefined) {
    return allTools;
  }

  return allTools.filter((tool) => enabledTools.has(tool.name));
}

function readEnabledTools() {
  const value = process.env.MILO_ENABLED_TOOLS;

  if (value === undefined || value === "") {
    return undefined;
  }

  return new Set(value.split(",").filter(Boolean));
}

function requiredString(value, name) {
  if (typeof value !== "string" || value === "") {
    throw new McpError(ErrorCode.InvalidParams, "Missing " + name);
  }

  return value;
}

function requiredOptionalString(value) {
  if (typeof value === "string" && value !== "") {
    return value;
  }

  return undefined;
}

function requiredStringArray(value, name) {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string" && item !== "")) {
    throw new McpError(ErrorCode.InvalidParams, "Missing " + name);
  }

  return value;
}

function optionalStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item) => typeof item === "string" && item !== "");
}

function requiredObject(value, name) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new McpError(ErrorCode.InvalidParams, "Missing " + name);
  }

  return value;
}

function jsonContent(value) {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
}

function textContent(value) {
  return { content: [{ type: "text", text: value }] };
}

await server.connect(new StdioServerTransport());
`
