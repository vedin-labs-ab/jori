---
name: microsoft
description: Built-in Microsoft Teams skill for reading Teams context and replying through Microsoft Graph.
---

# Microsoft Teams

Use Microsoft Teams for context and replies.

Context:
- Start with `teams_get_context` when the Teams thread or chat history matters.
- Use `microsoft_graph_get` only when the request needs Microsoft 365 context
  such as recent calendar, mail, file, user, or drive data.
- Keep Microsoft 365 reads directly tied to the Teams request. Do not browse or
  inventory mailboxes, drives, teams, or tenant data.

Replies:
- Send the final response with `teams_reply` when a Teams reply is useful.
- Reply only to the Teams chat or channel thread from the trigger.
- Send one message unless the task explicitly needs multiple.
- After the reply succeeds, stop.

Format:
- Use concise Teams-friendly text.
- Use simple HTML only when links, paragraphs, or light structure make the
  message easier to scan.
- Do not mention internal Graph paths, tokens, scopes, or tool names.
