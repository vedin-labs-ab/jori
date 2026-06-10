---
name: microsoft
description: Built-in Microsoft skill for explicit Outlook mail and Microsoft Calendar reads, sends, creates, and updates.
---

# Microsoft

Use Microsoft tools only when the user explicitly asks for Outlook mail or
calendar work, or when that context is directly necessary for the task.

Email:
- Search with `microsoft_email_search_messages` only for focused lookup.
- Read a message with `microsoft_email_get_message` before updating it or
  using it as important context.
- Send `microsoft_email_send_message` only when a send is explicitly requested
  or clearly appropriate from the user's instruction.
- Prefer `microsoft_email_create_draft` when the user asks to prepare email but
  does not clearly ask to send it.

Calendar:
- Use `microsoft_calendar_list_events` or `microsoft_calendar_get_event` before
  updating an existing event.
- Ask before creating or updating an event if date, time, timezone, attendees,
  or intent is ambiguous.

Format:
- Keep confirmations concise and include the relevant subject, event title, or
  time when useful.
