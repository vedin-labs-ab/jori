import { type Doc } from "../../../_generated/dataModel"
import { type AssetContext, readRunAssets } from "../../../assets/read"
import { requireMicrosoftCredentials } from "../../../integrations/microsoft/credentials"
import { microsoftGraphJson } from "../../../integrations/microsoft/graph"
import { base64EncodeBytes } from "../../../shared/encoding"
import {
  boundedNumber,
  optionalString,
  optionalStringArray,
  readArray,
  readRecord,
  requiredObject,
  requiredString,
  requiredStringArray,
} from "../../../shared/input"
import { sentMailResult } from "../mail"
import { callMicrosoftCalendarTool } from "./calendar"
import {
  microsoftDraftResult,
  microsoftMailMessage,
  microsoftMessageListQuery,
  microsoftMessageReadQuery,
  microsoftTextBodyHeaders,
} from "./mail"

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
    return microsoftMailMessage(
      readRecord(
        await microsoftGraphJson(token, messagePath(args), {
          query: microsoftMessageReadQuery,
          headers: microsoftTextBodyHeaders,
        })
      )
    )
  }
  if (tool === "microsoft_email_send_message") {
    const assets = await readRunAssets(context, args.assets, {
      maxBytes: 3 * 1024 * 1024,
    })
    await microsoftGraphJson(token, "/me/sendMail", {
      method: "POST",
      body: {
        message: buildMicrosoftMessage(args, assets),
        saveToSentItems: args.saveToSentItems !== false,
      },
    })
    // Graph's sendMail returns no message object, so neither can Jori.
    return sentMailResult({})
  }
  if (tool === "microsoft_email_create_draft") {
    const assets = await readRunAssets(context, args.assets, {
      maxBytes: 3 * 1024 * 1024,
    })
    return microsoftDraftResult(
      readRecord(
        await microsoftGraphJson(token, "/me/messages", {
          method: "POST",
          body: buildMicrosoftMessage(args, assets),
        })
      )
    )
  }
  if (tool === "microsoft_email_update_message") {
    return microsoftMailMessage(
      readRecord(
        await microsoftGraphJson(token, messagePath(args), {
          method: "PATCH",
          query: { $select: microsoftMessageListQuery.$select },
          headers: microsoftTextBodyHeaders,
          body: requiredObject(args.message, "message"),
        })
      )
    )
  }

  throw new Error(`Unknown Microsoft Email tool: ${tool}`)
}

function messagePath(args: Record<string, unknown>) {
  return `/me/messages/${encodeURIComponent(requiredString(args.messageId, "messageId"))}`
}

async function searchMessages(token: string, args: Record<string, unknown>) {
  const folderId = optionalString(args.folderId)
  const path =
    folderId === undefined
      ? "/me/messages"
      : `/me/mailFolders/${encodeURIComponent(folderId)}/messages`
  const query: Record<string, unknown> = {
    ...microsoftMessageListQuery,
    $top: boundedNumber(args.top, 10, 1, 25),
  }
  const search = optionalString(args.q)

  if (search === undefined) {
    query.$orderby = "receivedDateTime desc"
  } else {
    query.$search = `"${search.replace(/"/g, '\\"')}"`
  }

  const page = readRecord(await microsoftGraphJson(token, path, { query }))

  return {
    messages: readArray(page.value)
      .map(readRecord)
      .map((message) => microsoftMailMessage(message)),
  }
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
