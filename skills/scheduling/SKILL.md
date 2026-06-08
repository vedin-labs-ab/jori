---
name: scheduling
description: Built-in scheduling skill for creating, reading, updating, and deleting Milo schedules through the Milo MCP.
---

# Scheduling

Use the Milo tools to manage scheduled work:
- `add_schedule` creates a one-shot or recurring schedule.
- `search_schedules` finds schedules. Omit `query` when the user wants list-like behavior.
- `read_schedule` gets one schedule by id.
- `update_schedule` changes schedule details, timing, metadata, or output.
- `delete_schedule` removes a schedule.

Timing rules:
- One-shot schedules require an ISO timestamp in UTC ending with `Z`.
- Recurring schedules require a five-field cron expression interpreted in UTC.

Output rules:
- Every schedule must have a clear output target.
- If the user does not specify exactly where scheduled task output should be published, ask for clarification before creating or updating the schedule.
- Slack output needs a channel ID. Include a thread timestamp only when the output should go to a specific thread.
