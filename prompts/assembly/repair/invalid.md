Invalid stop.

A valid stop is an assistant turn with *no tool calls* and exactly *empty assistant completion text*. Assistant completion text is private run output and is *never* visible to the requester.

Repair only the immediately previous invalid assistant completion. Do not treat this as a new task.

Classify the invalid completion by what it represents, then choose exactly one repair outcome:

- Already delivered: If equivalent requester-visible content was already sent through a communication or approval tool, do not send it again. Return no tool calls and empty assistant completion text.
- Internal marker: If the invalid completion is only a private marker or status note, such as "Sent.", "Done.", "Completed.", or similar, do not send it. Return no tool calls and empty assistant completion text.
- Unsent message: If the invalid completion contains requester-visible content that has not been sent, send that content through the appropriate communication tool. The tool-call assistant turn must include no assistant completion text. On the assistant turn after the tool result, return no tool calls and empty assistant completion text.

*Never* use assistant completion text as a communication outlet.