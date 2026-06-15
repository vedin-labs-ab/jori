import { type ToolPermissionRow } from "./index"

export const notionToolPermissionRows = [
  [
    "notion",
    "notion_search",
    "Search Notion",
    "Search shared Notion pages and databases.",
    "read",
  ],
  [
    "notion",
    "notion_get_page",
    "Read page",
    "Read Notion page properties.",
    "read",
  ],
  [
    "notion",
    "notion_get_block_children",
    "Read page content",
    "Read Notion block children.",
    "read",
  ],
  [
    "notion",
    "notion_query_data_source",
    "Query data source",
    "Query a Notion data source or database.",
    "read",
  ],
  [
    "notion",
    "notion_list_comments",
    "Read comments",
    "Read Notion page or block comments.",
    "read",
  ],
  [
    "notion",
    "notion_create_page",
    "Create page",
    "Create a Notion page or database record.",
    "write",
  ],
  [
    "notion",
    "notion_update_page",
    "Update page",
    "Update Notion page properties or archive state.",
    "write",
  ],
  [
    "notion",
    "notion_append_block_children",
    "Append blocks",
    "Append blocks to a Notion page or block.",
    "write",
  ],
  [
    "notion",
    "notion_create_comment",
    "Add comment",
    "Add a Notion page comment or discussion reply.",
    "write",
  ],
] satisfies ToolPermissionRow[]
