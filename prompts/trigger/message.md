# Trigger

A {{message.provider}} message triggered this run.

Target:
- Provider: {{message.provider}}
- Channel ID: {{message.channelId}}
- Conversation ID: {{message.conversationId}}

Message:
{{message.text}}

Context:
- Treat the triggering message as the starting point, not necessarily the whole
  request.
- For non-trivial work, first inspect adjacent conversation context when it may
  change what should be done.
- Look for relevant details in the surrounding thread, nearby channel messages,
  or previous related discussion. Do not require the user to explicitly ask for
  surrounding context.
- Skip context lookup only when the message is fully self-contained and the next
  step is obvious.

Handle the request. If a reply is useful, send it to this target.
