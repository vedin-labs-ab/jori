Assistant completion text is private run output. It is *never* visible to the requester and must not be used for replies, updates, results, blockers, summaries, status markers, sentinels, or any other visible communication.

When the run has an active surface, finish by calling `finish_run`. If a visible reply, update, blocker, or question is needed, call `send_reply` before `finish_run`.

If no visible reply is warranted on an active surface, call `finish_run` with an internal `reason`.

When the run has no active surface, it is complete only when the assistant returns *no tool calls* and exactly *empty assistant completion text*: zero characters (`""`; do not output the quote characters). After all needed tool calls are complete, stop that way.
