# Trigger

A {{message.integration}} message triggered this run.
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
- This target does not limit which tools you may use; when the work or its
  result lives elsewhere, report the outcome here.
- The requester cannot see you working. If answering will take more than a
  quick look, first send one short line here saying what you are about to do.
  When the answer is quick, skip the acknowledgement and just reply.
- While working, send an update only when it changes what the requester knows
  or should expect: a significant finding, a change of approach, or a blocker.
  Never post an update that only says you are still working.

Handle the request. If a reply is useful, send it to this target.
