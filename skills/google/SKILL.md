---
name: google
description: Built-in Google Workspace skill for focused Gmail thread context and explicit Google Calendar actions.
---

# Google Workspace

Use Google Workspace for Gmail context, Gmail replies, and Calendar changes
when the user explicitly asks for Workspace work.

Gmail:
- Search Gmail with `google_gmail_search_threads` only when Gmail context is
  relevant to the user's request.
- Use `google_gmail_get_thread` for thread context and
  `google_gmail_get_message` for specific messages.
- Send a reply with `google_gmail_reply_to_thread` only when a response is
  explicitly requested or clearly appropriate from the user's instruction.
- Reply only to a thread you have inspected. Do not send unrelated email.

Calendar:
- Use Calendar tools only when the user explicitly asks to inspect, create, or
  update events.
- Prefer `primary` unless the user clearly names another calendar ID.
- Ask before creating or updating an event if date, time, timezone, attendees,
  or intent is ambiguous.

Format:
- Keep Gmail replies concise and plain text.
- Do not mention internal tool names in user-facing replies.
