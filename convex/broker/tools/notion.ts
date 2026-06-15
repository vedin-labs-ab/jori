import { type Doc } from "../../_generated/dataModel"
import { notionApiUrl, notionApiVersion } from "../../providers/notion/config"
import { requireNotionCredentials } from "../../providers/notion/credentials"
import { fetchJson } from "../../shared/http"
import { optionalString, requiredString } from "../../shared/input"

export async function callNotionTool(
  integration: Doc<"integrations">,
  tool: string,
  args: Record<string, unknown>
) {
  const handler = notionToolHandlers[tool]

  if (handler === undefined) {
    throw new Error(`Unknown Notion tool: ${tool}`)
  }

  return await handler(
    requireNotionCredentials(integration).tokens.access,
    args
  )
}

const notionToolHandlers: Record<
  string,
  (token: string, args: Record<string, unknown>) => Promise<unknown>
> = {
  notion_append_block_children: appendBlockChildren,
  notion_create_comment: createComment,
  notion_create_page: createPage,
  notion_get_block_children: getBlockChildren,
  notion_get_page: getPage,
  notion_list_comments: listComments,
  notion_query_data_source: queryDataSource,
  notion_search: search,
  notion_update_page: updatePage,
}

async function search(token: string, args: Record<string, unknown>) {
  return await notionJson(
    token,
    "POST",
    "/search",
    pickBody(args, ["query", "filter", "sort", "page_size", "start_cursor"])
  )
}

async function getPage(token: string, args: Record<string, unknown>) {
  return await notionJson(
    token,
    "GET",
    `/pages/${encodeURIComponent(requiredString(args.pageId, "pageId"))}`
  )
}

async function getBlockChildren(token: string, args: Record<string, unknown>) {
  return await notionJson(
    token,
    "GET",
    `/blocks/${encodeURIComponent(requiredString(args.blockId, "blockId"))}/children`,
    undefined,
    paginationParams(args)
  )
}

async function queryDataSource(token: string, args: Record<string, unknown>) {
  const sourceType =
    args.sourceType === "database" ? "databases" : "data_sources"
  return await notionJson(
    token,
    "POST",
    `/${sourceType}/${encodeURIComponent(requiredString(args.sourceId, "sourceId"))}/query`,
    pickBody(args, ["filter", "sorts", "page_size", "start_cursor"])
  )
}

async function listComments(token: string, args: Record<string, unknown>) {
  return await notionJson(token, "GET", "/comments", undefined, {
    block_id: requiredString(args.blockId, "blockId"),
    ...paginationParams(args),
  })
}

async function createPage(token: string, args: Record<string, unknown>) {
  return await notionJson(
    token,
    "POST",
    "/pages",
    pickBody(args, ["parent", "properties", "children", "icon", "cover"])
  )
}

async function updatePage(token: string, args: Record<string, unknown>) {
  return await notionJson(
    token,
    "PATCH",
    `/pages/${encodeURIComponent(requiredString(args.pageId, "pageId"))}`,
    pickBody(args, ["properties", "icon", "cover", "archived", "in_trash"])
  )
}

async function appendBlockChildren(
  token: string,
  args: Record<string, unknown>
) {
  return await notionJson(
    token,
    "PATCH",
    `/blocks/${encodeURIComponent(requiredString(args.blockId, "blockId"))}/children`,
    pickBody(args, ["children", "after"])
  )
}

async function createComment(token: string, args: Record<string, unknown>) {
  const pageId = optionalString(args.pageId)
  const discussionId = optionalString(args.discussionId)

  if (
    (pageId === undefined && discussionId === undefined) ||
    (pageId !== undefined && discussionId !== undefined)
  ) {
    throw new Error("Provide exactly one of pageId or discussionId")
  }

  return await notionJson(token, "POST", "/comments", {
    ...(pageId === undefined
      ? { discussion_id: discussionId }
      : { parent: { page_id: pageId } }),
    markdown: requiredString(args.markdown, "markdown"),
  })
}

async function notionJson(
  token: string,
  method: string,
  path: string,
  body?: unknown,
  queryParams: Record<string, unknown> = {}
) {
  const url = new URL(notionApiUrl + path)

  for (const [key, value] of Object.entries(queryParams)) {
    if (value !== undefined) {
      url.searchParams.set(key, String(value))
    }
  }

  return await fetchJson(url.toString(), {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "notion-version": notionApiVersion,
    },
    body,
  })
}

function paginationParams(args: Record<string, unknown>) {
  return pickBody(args, ["page_size", "start_cursor"]) ?? {}
}

function pickBody(args: Record<string, unknown>, keys: string[]) {
  const body: Record<string, unknown> = {}

  for (const key of keys) {
    if (args[key] !== undefined) {
      body[key] = args[key]
    }
  }

  return Object.keys(body).length === 0 ? undefined : body
}
