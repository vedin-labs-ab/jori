import { internal } from "../../_generated/api"
import { type Doc } from "../../_generated/dataModel"
import { type ActionCtx } from "../../_generated/server"
import { readArray, readRecord, readString } from "../../shared/input"
import { credentialSnapshot } from "../connect/snapshot"
import { NotionApiError, notionJson } from "./api"
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
    integration: Doc<"integrations">
  }
) {
  if (args.pageId === undefined) {
    return args.data
  }

  let page: NotionPageContext | undefined
  try {
    page = await fetchNotionPageContext(args.integration, args.pageId)
  } catch (error) {
    if (!(error instanceof NotionApiError) || error.status !== 401) {
      throw error
    }
    await ctx.runMutation(internal.integrations.expire.markExpired, {
      integrationId: args.integration._id,
      expectedSnapshot: credentialSnapshot(args.integration),
    })
    return args.data
  }

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
  integration: Doc<"integrations">,
  pageId: string
): Promise<NotionPageContext | undefined> {
  try {
    const page = readRecord(
      await notionJson(
        requireNotionCredentials(integration).tokens.access,
        "GET",
        `/pages/${encodeURIComponent(pageId)}`
      )
    )

    return {
      id: pageId,
      title: notionPageTitle(page),
      url: readString(page, "url"),
    }
  } catch (error) {
    if (
      error instanceof NotionApiError &&
      (error.status === 403 || error.status === 404)
    ) {
      return undefined
    }
    throw error
  }
}

function notionRichTextPlainText(value: unknown) {
  const text = readRecord(value).plain_text

  return typeof text === "string" ? text : ""
}
