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
      children: notionChildrenProperty(),
      parent: notionParentProperty(),
      properties: objectProperty("Notion page properties."),
    },
  }),
  notion_update_page: objectSchema({
    required: ["pageId"],
    properties: {
      archived: { type: "boolean" },
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
      children: notionChildrenProperty(),
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

function notionChildrenProperty() {
  return {
    type: "array",
    description:
      "Notion block children. Milo supports paragraph, headings, list items, quote, to_do, and divider blocks.",
    items: {
      oneOf: [
        richTextBlock("paragraph"),
        richTextBlock("heading_1"),
        richTextBlock("heading_2"),
        richTextBlock("heading_3"),
        richTextBlock("bulleted_list_item"),
        richTextBlock("numbered_list_item"),
        richTextBlock("quote"),
        richTextBlock("to_do", {
          checked: { type: "boolean" },
        }),
        emptyBlock("divider"),
      ],
    },
  }
}

function richTextBlock(type: string, extra: Record<string, unknown> = {}) {
  return objectSchema({
    required: ["object", "type", type],
    properties: {
      object: { type: "string", enum: ["block"] },
      type: { type: "string", enum: [type] },
      [type]: objectSchema({
        required: ["rich_text"],
        properties: {
          rich_text: {
            type: "array",
            items: textRichTextSchema(),
          },
          ...extra,
        },
      }),
    },
  })
}

function emptyBlock(type: string) {
  return objectSchema({
    required: ["object", "type", type],
    properties: {
      object: { type: "string", enum: ["block"] },
      type: { type: "string", enum: [type] },
      [type]: objectSchema({}),
    },
  })
}

function textRichTextSchema() {
  return objectSchema({
    required: ["type", "text"],
    properties: {
      type: { type: "string", enum: ["text"] },
      text: objectSchema({
        required: ["content"],
        properties: {
          content: stringProperty("Text content."),
        },
      }),
    },
  })
}

function notionParentProperty() {
  return {
    description:
      "Notion parent. Use page_id for a subpage or data_source_id/database_id for a database record.",
    oneOf: [
      objectSchema({
        required: ["page_id"],
        properties: { page_id: stringProperty("Parent page ID.") },
      }),
      objectSchema({
        required: ["data_source_id"],
        properties: {
          data_source_id: stringProperty("Parent data source ID."),
          database_id: stringProperty("Legacy database ID, when present."),
        },
      }),
      objectSchema({
        required: ["database_id"],
        properties: { database_id: stringProperty("Parent database ID.") },
      }),
    ],
  }
}

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
