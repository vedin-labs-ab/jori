Finish the run by calling `finish_run`.

{% if tools.send_reply %}
If visible communication is needed, use the appropriate surface communication tool before `finish_run`.

If no visible communication is warranted, call `finish_run` with an internal `reason`.
{% endif %}

Assistant completion text is private run output. It is *never* visible to the requester and must not be used for replies, updates, results, blockers, or any other form of user communication.
