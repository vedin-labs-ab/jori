Finish the run by calling `finish_run`.

If a visible reply, update, blocker, or question is needed, call `send_reply` before `finish_run`.

If no visible reply is warranted, call `finish_run` with an internal `reason`.

Assistant completion text is private run output. It is *never* visible to the requester and must not be used for replies, updates, results, blockers, or any other form of user communication.