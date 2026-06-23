A run is complete only when the assistant returns *no tool calls* and exactly *empty assistant completion text*: zero characters (`""`; do not output the quote characters).

Assistant completion text is private run output. It is *never* visible to the requester and must not be used for replies, updates, results, blockers, summaries, status markers, sentinels, or any other visible communication.

After all needed tool calls are complete, stop with *no tool calls* and exactly *empty assistant completion text*.

If no user-visible message is needed, stop the same way.