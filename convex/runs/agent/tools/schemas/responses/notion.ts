import {
  constField,
  providerPayload,
  resultSchema,
  type SchemaMap,
  stringField,
} from "./common"

// Notion tools return Notion API objects unchanged; only the file upload is
// assembled by Milo so the result can be embedded directly in blocks.

export const notionToolResponseSchemas = {
  notion_search: providerPayload(
    "Notion's search response: results of page and data source objects, with next_cursor and has_more."
  ),
  notion_get_page: providerPayload(
    "Notion's page object with its property values, unchanged."
  ),
  notion_get_block_children: providerPayload(
    "Notion's block children listing: results of block objects, with next_cursor and has_more."
  ),
  notion_query_data_source: providerPayload(
    "Notion's query response: results of page objects, with next_cursor and has_more."
  ),
  notion_list_comments: providerPayload(
    "Notion's comment listing: results of comment objects, with next_cursor and has_more."
  ),
  notion_create_page: providerPayload(
    "Notion's created page object, unchanged."
  ),
  notion_update_page: providerPayload(
    "Notion's page object after the update, unchanged."
  ),
  notion_append_block_children: providerPayload(
    "Notion's append response: results of the created block objects."
  ),
  notion_create_comment: providerPayload(
    "Notion's created comment object, unchanged."
  ),
  notion_upload_file: resultSchema({
    required: ["fileUpload", "file"],
    properties: {
      fileUpload: providerPayload(
        "Notion's file_upload object with status uploaded."
      ),
      file: resultSchema({
        description: "Ready-to-embed file reference for Notion blocks.",
        required: ["type", "file_upload"],
        properties: {
          type: constField("file_upload", "Notion file reference type."),
          file_upload: resultSchema({
            required: ["id"],
            properties: {
              id: stringField("Notion file upload ID."),
            },
          }),
        },
      }),
    },
  }),
} satisfies SchemaMap
