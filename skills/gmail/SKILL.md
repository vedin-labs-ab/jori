---
name: gmail
description: Built-in Gmail skill for focused thread context and explicit email replies.
---

# Gmail

Use Gmail only when the user explicitly asks for email work or when email
context is directly relevant to the task.

Context:
- Search Gmail with `google_gmail_search_threads` only for focused lookup.
- Read thread context with `google_gmail_get_thread` before replying.
- Use `google_gmail_get_message` for a specific message when needed.

Replies:
- Send `google_gmail_reply_to_thread` only when a reply is explicitly requested
  or clearly appropriate from the user's instruction.
- Reply only to a thread you have inspected. Do not send unrelated email.

Format:
- Keep replies concise and plain text.
- Do not mention internal tool names in user-facing replies.
