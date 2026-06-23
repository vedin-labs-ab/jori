Invalid stop.

A valid stop is an assistant turn with no tool calls and exactly empty assistant completion text: zero characters (`""`; do not output the quote characters). Assistant completion text is private run output and is never visible to the requester.

This repair turn cannot call tools, communicate, or perform work. It only repairs the stop protocol.

Review the immediately previous assistant completion and the run history.

Choose exactly one outcome:

- Already delivered or private: If the invalid completion is a private status marker, receipt, sentinel, or content already delivered by a prior communication or approval tool call, return no tool calls and empty assistant completion text.
- Undelivered visible content: If the invalid completion contains requester-visible content that was not delivered, do not try to deliver it here. Return exactly `INVALID_STOP_UNDELIVERED_CONTENT`.

Never use assistant completion text as a communication outlet. Never reconstruct, summarize, or repeat content from earlier tool calls.
