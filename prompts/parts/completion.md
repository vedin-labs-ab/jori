Assistant completion text is private run output and is NEVER shown to the requester.

After all needed user-visible communication has been sent, or when no user-visible message is needed, *finish with an empty assistant completion*.

A run is complete only when the assistant returns *no tool calls* and exactly *empty assistant completion text*: zero characters (`""`; do not output the quote characters).

Assistant completion text is private run output. It is *never* visible to the requester and must not be used for replies, updates, results, blockers, summaries, status markers, or sentinels.

Never write `EOF`, `DONE`, "Sent.", "Done.", "Completed.", whitespace, or any other marker as assistant completion text.

After the last needed tool result, if no further action is needed, the next assistant turn must return no tool calls and exactly empty assistant completion text.

If no user-visible message is needed, stop with no tool calls and exactly empty assistant completion text.
