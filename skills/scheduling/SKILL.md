---
name: scheduling
description: Built-in scheduling skill for creating, reading, updating, and deleting schedules.
---

# Scheduling

Use schedule tools when the user asks to create, find, inspect, change, or
delete scheduled work.

Timing:
- One-shot schedules require an ISO timestamp in UTC ending with `Z`.
- Recurring schedules require a five-field cron expression interpreted in UTC.
- If timing is ambiguous, ask before creating or updating.

Output:
- Creating or updating a schedule requires a clear output target.
- For Slack output, use `type: "slack"`, a channel ID, and a thread timestamp
  only when output belongs in a specific thread.
- If the output target is missing or ambiguous, ask before creating or updating.
