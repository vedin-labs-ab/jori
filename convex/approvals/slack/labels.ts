export function getToolLabel(tool: string) {
  return toolLabels[tool] ?? humanizeToolName(tool)
}

function humanizeToolName(tool: string) {
  return tool
    .split("_")
    .filter((part) => part !== "")
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ")
}

const toolLabels: Record<string, string> = {
  add_automation: "Add automation",
  channels_list: "List Slack channels",
  conversations_add_message: "Send Slack message",
  conversations_history: "Read Slack channel history",
  conversations_replies: "Read Slack thread replies",
  conversations_search_messages: "Search Slack messages",
  delete_automation: "Delete automation",
  google_calendar_create_event: "Create Google Calendar event",
  google_calendar_get_event: "Read Google Calendar event",
  google_calendar_list_events: "List Google Calendar events",
  google_calendar_update_event: "Update Google Calendar event",
  google_drive_create_file: "Create Google Drive file",
  google_drive_get_file: "Read Google Drive file metadata",
  google_drive_read_file: "Read Google Drive file content",
  google_drive_search_files: "Search Google Drive files",
  google_drive_update_file: "Update Google Drive file",
  google_gmail_create_draft: "Create Gmail draft",
  google_gmail_get_message: "Read Gmail message",
  google_gmail_get_thread: "Read Gmail thread",
  google_gmail_reply_to_thread: "Reply to Gmail thread",
  google_gmail_search_threads: "Search Gmail threads",
  google_gmail_send_message: "Send Gmail email",
  github_add_issue_comment: "Add GitHub issue comment",
  github_clone_repository: "Clone GitHub repository",
  github_get_file: "Read GitHub file",
  github_get_issue: "Read GitHub issue",
  github_get_pull_request: "Read GitHub pull request",
  github_get_repository: "Read GitHub repository",
  github_list_repositories: "List GitHub repositories",
  github_search_issues: "Search GitHub issues and pull requests",
  linear_add_comment: "Add Linear comment",
  linear_get_issue: "Read Linear issue",
  linear_list_comments: "Read Linear comments",
  linear_search_issues: "Search Linear issues",
  microsoft_calendar_create_event: "Create Microsoft Calendar event",
  microsoft_calendar_get_event: "Read Microsoft Calendar event",
  microsoft_calendar_list_events: "List Microsoft Calendar events",
  microsoft_calendar_update_event: "Update Microsoft Calendar event",
  microsoft_email_create_draft: "Create Outlook draft",
  microsoft_email_get_message: "Read Outlook message",
  microsoft_email_search_messages: "Search Outlook messages",
  microsoft_email_send_message: "Send Outlook email",
  microsoft_email_update_message: "Update Outlook message",
  notion_append_block_children: "Append Notion blocks",
  notion_create_comment: "Add Notion comment",
  notion_create_page: "Create Notion page",
  notion_get_block_children: "Read Notion page content",
  notion_get_page: "Read Notion page",
  notion_list_comments: "Read Notion comments",
  notion_query_data_source: "Query Notion data source",
  notion_search: "Search Notion",
  notion_update_page: "Update Notion page",
  read_attachment: "Read attachment",
  read_automation: "Read automation",
  save_attachment: "Save attachment",
  search_attachments: "Search attachments",
  search_automations: "Search automations",
  update_automation: "Update automation",
  users_search: "Search Slack users",
}
