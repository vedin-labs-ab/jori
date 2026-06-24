Finish the run by calling `finish_run`.

{% if tools.send_reply %}
Before `finish_run`, use the appropriate surface communication tool only when user-visible communication is warranted. Use `send_reply` for words; use a surface-specific reaction tool for a small signal when one is available.

If no user-visible communication is warranted, call `finish_run` with an internal `reason`.
{% endif %}

Assistant completion text is private run output. It is *never* visible to the requester and must not be used for replies, updates, results, blockers, or any other form of user communication.
