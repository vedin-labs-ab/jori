# Trigger

A {{message.provider}} message triggered this run.
Current UTC time: {{time.utc}}.

Target:
{{message.target}}

Message:
```text
{{message.text}}
```

Context:
- The message is the starting point, not necessarily the whole request. For
  non-trivial work, check the surrounding thread or related discussion before
  acting; skip this only when the message is self-contained and the next step
  is obvious.
- This target does not limit which tools you may use. When work happens
  elsewhere, send a concise status here.

Handle the request. If a reply is useful, send it to this target.
