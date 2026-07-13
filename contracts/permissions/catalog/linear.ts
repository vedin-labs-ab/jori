import { type ToolPermissionRow } from "../types"

export const linearToolPermissionRows = [
  [
    "linear",
    "linear_search_issues",
    "Search issues",
    "Search Linear issues.",
    "Search Linear issues by identifier like ENG-123, or by text matched against titles, descriptions, and comments. Use to find the right issue before reading it in full.",
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
    "Comment on a Linear issue, or reply under an existing comment to stay in-thread. Confirm the target before posting.",
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
