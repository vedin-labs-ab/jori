import { type Doc } from "../../_generated/dataModel"
import { type AssetContext, readRunAssets } from "../../assets/read"
import { requireMicrosoftCredentials } from "../../providers/microsoft/credentials"
import { base64EncodeBytes } from "../../shared/encoding"
import { fetchJson } from "../../shared/http"
import {
  boundedNumber,
  optionalString,
  optionalStringArray,
  requiredObject,
  requiredString,
  requiredStringArray,
} from "../../shared/input"

export async function callMicrosoftTool(
  integration: Doc<"integrations">,
  tool: string,
  args: Record<string, unknown>,
  context?: AssetContext
) {
  const credentials = requireMicrosoftCredentials(integration)

  if (tool.startsWith("microsoft_email_")) {
    return await callMicrosoftEmailTool(
      credentials.tokens.access,
      tool,
      args,
      context
    )
  }

  if (tool.startsWith("microsoft_calendar_")) {
    return await callMicrosoftCalendarTool(
      credentials.tokens.access,
      tool,
      args
    )
  }

  throw new Error(`Unknown Microsoft tool: ${tool}`)
}

async function callMicrosoftEmailTool(
  token: string,
  tool: string,
  args: Record<string, unknown>,
  context?: AssetContext
) {
  if (tool === "microsoft_email_search_messages") {
    return await searchMessages(token, args)
  }

  if (tool === "microsoft_email_get_message") {
    return await microsoftGraph(
      token,
      `/me/messages/${encodeURIComponent(requiredString(args.messageId, "messageId"))}`
    )
  }

  if (tool === "microsoft_email_send_message") {
    const assets = await readRunAssets(context, args.assets, {
      maxBytes: 3 * 1024 * 1024,
    })

    await microsoftGraph(token, "/me/sendMail", {
      method: "POST",
      body: {
        message: buildMicrosoftMessage(args, assets),
        saveToSentItems: args.saveToSentItems !== false,
      },
    })
    return "sent"
  }

  if (tool === "microsoft_email_create_draft") {
    const assets = await readRunAssets(context, args.assets, {
      maxBytes: 3 * 1024 * 1024,
    })

    return await microsoftGraph(token, "/me/messages", {
      method: "POST",
      body: buildMicrosoftMessage(args, assets),
    })
  }

  if (tool === "microsoft_email_update_message") {
    return await microsoftGraph(
      token,
      `/me/messages/${encodeURIComponent(requiredString(args.messageId, "messageId"))}`,
      {
        method: "PATCH",
        body: requiredObject(args.message, "message"),
      }
    )
  }

  throw new Error(`Unknown Microsoft Email tool: ${tool}`)
}

async function callMicrosoftCalendarTool(
  token: string,
  tool: string,
  args: Record<string, unknown>
) {
  if (tool === "microsoft_calendar_list_events") {
    return await listEvents(token, args)
  }

  if (tool === "microsoft_calendar_get_event") {
    return await microsoftGraph(
      token,
      `/me/events/${encodeURIComponent(requiredString(args.eventId, "eventId"))}`
    )
  }

  if (tool === "microsoft_calendar_create_event") {
    return await microsoftGraph(token, "/me/events", {
      method: "POST",
      query: microsoftSendUpdatesQuery(args),
      body: requiredObject(args.event, "event"),
    })
  }

  if (tool === "microsoft_calendar_update_event") {
    return await microsoftGraph(
      token,
      `/me/events/${encodeURIComponent(requiredString(args.eventId, "eventId"))}`,
      {
        method: "PATCH",
        query: microsoftSendUpdatesQuery(args),
        body: requiredObject(args.event, "event"),
      }
    )
  }

  throw new Error(`Unknown Microsoft Calendar tool: ${tool}`)
}

async function searchMessages(token: string, args: Record<string, unknown>) {
  const folderId = optionalString(args.folderId)
  const path =
    folderId === undefined
      ? "/me/messages"
      : `/me/mailFolders/${encodeURIComponent(folderId)}/messages`
  const query: Record<string, unknown> = {
    $top: boundedNumber(args.top, 10, 1, 25),
  }
  const search = optionalString(args.q)

  if (search === undefined) {
    query.$orderby = "receivedDateTime desc"
  } else {
    query.$search = `"${search.replace(/"/g, '\\"')}"`
  }

  return await microsoftGraph(token, path, { query })
}

async function listEvents(token: string, args: Record<string, unknown>) {
  const timeMin = optionalString(args.timeMin)
  const timeMax = optionalString(args.timeMax)
  const query: Record<string, unknown> = {
    $top: boundedNumber(args.top, 10, 1, 50),
    $orderby: "start/dateTime",
  }

  if (timeMin === undefined && timeMax === undefined) {
    return await microsoftGraph(token, "/me/events", { query })
  }

  return await microsoftGraph(token, "/me/calendarView", {
    query: {
      ...query,
      startDateTime: timeMin ?? new Date().toISOString(),
      endDateTime:
        timeMax ??
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
  })
}

async function microsoftGraph(
  token: string,
  path: string,
  options: {
    method?: string
    query?: Record<string, unknown>
    body?: unknown
  } = {}
) {
  const url = new URL(`https://graph.microsoft.com/v1.0${path}`)

  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value))
    }
  }

  return await fetchJson(url.toString(), {
    method: options.method ?? "GET",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
    },
    body: options.body,
    emptyResponse: null,
  })
}

function microsoftSendUpdatesQuery(args: Record<string, unknown>) {
  return args.sendUpdates === "all" || args.sendUpdates === "none"
    ? { sendUpdates: args.sendUpdates }
    : {}
}

function buildMicrosoftMessage(
  args: Record<string, unknown>,
  assets: Awaited<ReturnType<typeof readRunAssets>> = []
) {
  return {
    subject: requiredString(args.subject, "subject"),
    body: {
      contentType: args.bodyType === "HTML" ? "HTML" : "Text",
      content: requiredString(args.body, "body"),
    },
    toRecipients: recipients(requiredStringArray(args.to, "to")),
    ccRecipients: recipients(optionalStringArray(args.cc)),
    bccRecipients: recipients(optionalStringArray(args.bcc)),
    ...(assets.length === 0
      ? {}
      : {
          attachments: assets.map((asset) => ({
            "@odata.type": "#microsoft.graph.fileAttachment",
            name: asset.name,
            contentType: asset.mimeType,
            contentBytes: base64EncodeBytes(asset.bytes),
          })),
        }),
  }
}

function recipients(addresses: string[]) {
  return addresses.map((address) => ({ emailAddress: { address } }))
}
