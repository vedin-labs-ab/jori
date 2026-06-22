# Trigger

A {{message.integration}} message triggered this run.
Current UTC time: {{time.utc}}.

Target:
{{message.target}}

Recent conversation:
{{message.conversation}}

Message:
```text
{{message.text}}
```

Context:
- The message is the starting point, not necessarily the whole request. For
  non-trivial work, check the surrounding thread or related discussion before
  acting; skip this only when the message is self-contained and the next step
  is obvious.
- This target does not limit which tools you may use; when the work or its
  result lives elsewhere, report the outcome here.
- If no reply or action is useful, complete silently with an empty final
  response.
{{message.delivery}}
{{message.progress}}
- While working, send an update only when it changes what the requester knows
  or should expect: a significant finding, a change of approach, or a blocker.
  Never post an update that only says you are still working.

Handle the request.
