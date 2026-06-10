---
name: calendar
description: Built-in Google Calendar skill for explicit calendar reads, creates, and updates.
---

# Google Calendar

Use Calendar tools only when the user explicitly asks to inspect, create, or
update events.

Events:
- Prefer the `primary` calendar unless the user clearly names another calendar
  ID.
- Use `google_calendar_list_events` or `google_calendar_get_event` before
  updating an existing event.
- Ask before creating or updating an event if date, time, timezone, attendees,
  or intent is ambiguous.

Format:
- Keep confirmations concise and include the event title and time when useful.
