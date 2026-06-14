import { internal } from "../../_generated/api"
import { type ActionCtx } from "../../_generated/server"
import { fetchJson } from "../../broker/providers/common"
import { notionApiUrl, notionApiVersion } from "./config"
import { requireNotionCredentials } from "./credentials"

type NotionPageContext = {
  id: string
  title?: string
  url?: string
}

export async function enrichNotionEventData(
  ctx: ActionCtx,
  args: {
    data: Record<string, unknown>
    pageId: string | undefined
    workspaceId: string
  }
) {
  const page = await fetchNotionPageContext(ctx, args)

  if (page === undefined) {
    return args.data
  }

  return {
    ...args.data,
    page,
  }
}

export function notionPageTitle(object: Record<string, unknown>) {
  const title = readArray(object.title)
    .map(notionRichTextPlainText)
    .join("")
    .trim()

  if (title !== "") {
    return title
  }

  const properties = readRecord(object.properties)

  for (const property of Object.values(properties).map(readRecord)) {
    if (property.type !== "title") {
      continue
    }

    const propertyTitle = readArray(property.title)
      .map(notionRichTextPlainText)
      .join("")
      .trim()

    if (propertyTitle !== "") {
      return propertyTitle
    }
  }

  return undefined
}

async function fetchNotionPageContext(
  ctx: ActionCtx,
  args: {
    pageId: string | undefined
    workspaceId: string
  }
): Promise<NotionPageContext | undefined> {
  if (args.pageId === undefined) {
    return undefined
  }

  const integration = await ctx.runQuery(
    internal.integrations.lookup.activeByProviderExternal,
    { provider: "notion", externalId: args.workspaceId }
  )

  if (integration === null) {
    return undefined
  }

  try {
    const page = readRecord(
      await fetchJson(
        `${notionApiUrl}/pages/${encodeURIComponent(args.pageId)}`,
        {
          method: "GET",
          headers: {
            authorization: `Bearer ${
              requireNotionCredentials(integration).tokens.access
            }`,
            "notion-version": notionApiVersion,
          },
        }
      )
    )

    return {
      id: args.pageId,
      title: notionPageTitle(page),
      url: readString(page, "url"),
    }
  } catch {
    return undefined
  }
}

function notionRichTextPlainText(value: unknown) {
  const text = readRecord(value).plain_text

  return typeof text === "string" ? text : ""
}

function readRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function readArray(value: unknown) {
  return Array.isArray(value) ? value : []
}

function readString(record: Record<string, unknown>, key: string) {
  const value = record[key]

  return typeof value === "string" && value !== "" ? value : undefined
}
