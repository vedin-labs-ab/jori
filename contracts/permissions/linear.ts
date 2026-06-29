import { type ToolPermissionRow } from "./index"

export const linearToolPermissionRows = [
  [
    "linear",
    "linear_search_issues",
    "Search issues",
    "Search Linear issues.",
    "Search Linear issues by query. Use to find issues before reading them.",
    "read",
  ],
  [
    "linear",
    "linear_get_issue",
    "Read issue",
    "Read a Linear issue.",
    "Read a Linear issue's details. Use to get full context before commenting.",
    "read",
  ],
  [
    "linear",
    "linear_list_comments",
    "Read comments",
    "Read comments on a Linear issue.",
    "Read a Linear issue's comments. Use to see discussion before replying.",
    "read",
  ],
  [
    "linear",
    "linear_add_comment",
    "Add comment",
    "Comment on a Linear issue.",
    "Add a comment to a Linear issue. Confirm the target issue before posting.",
    "write",
    "required",
  ],
  [
    "linear",
    "linear_add_reaction",
    "Add reaction",
    "React to a Linear issue, comment, or update with an emoji.",
    "Add an emoji reaction to a Linear issue, comment, or project update. Use as a lightweight acknowledgement.",
    "write",
    "required",
  ],
] satisfies ToolPermissionRow[]
