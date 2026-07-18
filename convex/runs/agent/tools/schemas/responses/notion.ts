import {
  arrayProperty,
  booleanProperty,
  constProperty,
  type JsonSchema,
  objectSchema,
  type SchemaMap,
  stringProperty,
} from "./common"

// Notion tools deliberately return Notion API objects unchanged: agents echo
// the same property and block structures back into the write tools, so
// fidelity beats reshaping. The schemas document Notion's stable object
// model without freezing its full surface.

function notionObject(kind: string, description: string): JsonSchema {
  return {
    type: "object",
    additionalProperties: true,
    description,
    properties: {
      object: constProperty(kind, `Always ${kind}.`),
      id: stringProperty(`Notion ${kind} ID.`),
    },
  }
}

function notionPage(description: string): JsonSchema {
  const page = notionObject("page", description)

  return {
    ...page,
    properties: {
      ...(page.properties as Record<string, unknown>),
      url: stringProperty("Page URL."),
      archived: booleanProperty("True when archived."),
      parent: {
        type: "object",
        additionalProperties: true,
        description: "Parent reference: page, data source, or workspace.",
      },
      properties: {
        type: "object",
        additionalProperties: true,
        description:
          "Property values keyed by property name, in Notion's typed value format - reuse these structures when updating.",
      },
    },
  }
}

function notionListing(itemDescription: string, item: JsonSchema): JsonSchema {
  return {
    type: "object",
    additionalProperties: true,
    description: itemDescription,
    properties: {
      object: constProperty("list", "Always list."),
      results: arrayProperty("The page of results.", item),
      next_cursor: {
        type: ["string", "null"],
        description: "Pass as start_cursor to continue; null on the last page.",
      },
      has_more: booleanProperty("True when more results exist."),
    },
  }
}

function notionBlock(description: string): JsonSchema {
  const block = notionObject("block", description)

  return {
    ...block,
    properties: {
      ...(block.properties as Record<string, unknown>),
      type: stringProperty(
        "Block type; the same-named key holds the block's content."
      ),
      has_children: booleanProperty("True when nested blocks exist."),
    },
  }
}

function notionComment(description: string): JsonSchema {
  const comment = notionObject("comment", description)

  return {
    ...comment,
    properties: {
      ...(comment.properties as Record<string, unknown>),
      discussion_id: stringProperty("Thread the comment belongs to."),
      rich_text: arrayProperty("Comment content as rich text.", {
        type: "object",
        additionalProperties: true,
      }),
    },
  }
}

export const notionToolResponseSchemas = {
  notion_search: notionListing(
    "Pages and data sources matching the query.",
    notionObject("page", "Page or data source object, unchanged.")
  ),
  notion_get_page: notionPage("The page object with its property values."),
  notion_get_block_children: notionListing(
    "The block's direct children.",
    notionBlock("Child block, unchanged.")
  ),
  notion_query_data_source: notionListing(
    "Rows matching the query.",
    notionPage("Row page object with its property values.")
  ),
  notion_list_comments: notionListing(
    "Comments on the block or page.",
    notionComment("Comment, unchanged.")
  ),
  notion_create_page: notionPage("The created page object."),
  notion_update_page: notionPage("The page object after the update."),
  notion_append_block_children: notionListing(
    "The created blocks.",
    notionBlock("Created block, unchanged.")
  ),
  notion_create_comment: notionComment("The created comment."),
  notion_upload_file: objectSchema({
    required: ["fileUpload", "file"],
    properties: {
      fileUpload: {
        type: "object",
        additionalProperties: true,
        description: "Notion's file_upload object with status uploaded.",
      },
      file: objectSchema({
        description: "Ready-to-embed file reference for Notion blocks.",
        required: ["type", "file_upload"],
        properties: {
          type: constProperty("file_upload", "Notion file reference type."),
          file_upload: objectSchema({
            required: ["id"],
            properties: {
              id: stringProperty("Notion file upload ID."),
            },
          }),
        },
      }),
    },
  }),
} satisfies SchemaMap
