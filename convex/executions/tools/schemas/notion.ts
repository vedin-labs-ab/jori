import {
  numberProperty,
  objectProperty,
  objectSchema,
  type SchemaMap,
  stringProperty,
} from "./common"

export const notionToolInputSchemas = {
  notion_search: objectSchema({
    properties: notionPaginationProperties({
      filter: objectProperty("Notion search filter."),
      query: stringProperty("Search query."),
      sort: objectProperty("Notion search sort."),
    }),
  }),
  notion_get_page: objectSchema({
    required: ["pageId"],
    properties: {
      pageId: stringProperty("Notion page ID."),
    },
  }),
  notion_get_block_children: notionBlockPaginationSchema("blockId"),
  notion_query_data_source: objectSchema({
    required: ["sourceId"],
    properties: notionPaginationProperties({
      filter: objectProperty("Notion query filter."),
      sorts: { type: "array", items: { type: "object" } },
      sourceId: stringProperty("Notion data source ID or legacy database ID."),
      sourceType: {
        type: "string",
        enum: ["dataSource", "database"],
        description: "Use database only for legacy database IDs.",
      },
    }),
  }),
  notion_list_comments: notionBlockPaginationSchema("blockId"),
  notion_create_page: objectSchema({
    required: ["parent", "properties"],
    properties: {
      children: { type: "array", items: { type: "object" } },
      cover: objectProperty("Notion cover object."),
      icon: objectProperty("Notion icon object."),
      parent: objectProperty("Notion page parent."),
      properties: objectProperty("Notion page properties."),
    },
  }),
  notion_update_page: objectSchema({
    required: ["pageId"],
    properties: {
      archived: { type: "boolean" },
      cover: objectProperty("Notion cover object."),
      icon: objectProperty("Notion icon object."),
      in_trash: { type: "boolean" },
      pageId: stringProperty("Notion page ID."),
      properties: objectProperty("Notion page properties."),
    },
  }),
  notion_append_block_children: objectSchema({
    required: ["blockId", "children"],
    properties: {
      after: stringProperty("Optional block ID to append after."),
      blockId: stringProperty("Notion block or page ID."),
      children: { type: "array", items: { type: "object" } },
    },
  }),
  notion_create_comment: objectSchema({
    required: ["markdown"],
    properties: {
      discussionId: stringProperty("Discussion ID for a reply."),
      markdown: stringProperty("Comment text in Notion-supported Markdown."),
      pageId: stringProperty("Page ID for a top-level comment."),
    },
  }),
} satisfies SchemaMap

function notionBlockPaginationSchema(idProperty: string) {
  return objectSchema({
    required: [idProperty],
    properties: notionPaginationProperties({
      [idProperty]: stringProperty("Notion block or page ID."),
    }),
  })
}

function notionPaginationProperties(properties: Record<string, unknown>) {
  return {
    page_size: numberProperty("Maximum Notion results to return.", 1, 100),
    start_cursor: stringProperty("Notion pagination cursor."),
    ...properties,
  }
}
