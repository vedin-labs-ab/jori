import { internal } from "../../_generated/api"
import { type Doc } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"
import { fetchJson } from "../../shared/http"
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
  if (args.pageId === undefined) {
    return args.data
  }

  const integration = await ctx.runQuery(
    internal.integrations.lookup.activeByIntegrationExternal,
    { integration: "notion", externalId: args.workspaceId }
  )

  if (integration === null) {
    return args.data
  }

  const page = await fetchNotionPageContext(integration, args.pageId)

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

export async function fetchNotionPageContext(
  integration: Doc<"integrations">,
  pageId: string
): Promise<NotionPageContext | undefined> {
  try {
    const page = readRecord(
      await fetchJson(`${notionApiUrl}/pages/${encodeURIComponent(pageId)}`, {
        method: "GET",
        headers: {
          authorization: `Bearer ${
            requireNotionCredentials(integration).tokens.access
          }`,
          "notion-version": notionApiVersion,
        },
      })
    )

    return {
      id: pageId,
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
