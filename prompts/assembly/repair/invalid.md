Invalid stop.

A valid stop is an assistant turn with no tool calls and exactly empty assistant completion text: zero characters (`""`; do not output the quote characters). Assistant completion text is private run output and is never visible to the requester.

Repair only the immediately previous invalid assistant completion. The invalid completion is the content of the immediately previous assistant turn, not any earlier tool call, tool result, or message. Do not treat this as a new task.

A repair may deliver only requester-visible content from the invalid completion itself. Never repeat content from earlier communication or approval tool calls.

Choose exactly one outcome:

- Already delivered: If the invalid completion contains requester-visible content and equivalent content was already sent through a communication or approval tool, do not send it again. Return no tool calls and empty assistant completion text.
- Internal marker: If the invalid completion is only a private marker, status note, or sentinel, such as `EOF`, `DONE`, "Sent.", "Done.", "Completed.", or similar, do not send it. Return no tool calls and empty assistant completion text.
- Unsent message: If the invalid completion itself contains requester-visible content that has not been sent, send only that content through the appropriate communication tool. The tool-call assistant turn must include no assistant completion text. After the tool result, return no tool calls and empty assistant completion text.

Never use assistant completion text as a communication outlet.
