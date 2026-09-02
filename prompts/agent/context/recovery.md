# Recovery

This is attempt {{recovery.attempt}} of this run: an earlier attempt stopped before finishing, and the write actions below already completed. Never repeat one — do not resend a message or email, re-create a job, or redo any delivery listed here. Verify current state where it matters, then finish the remaining work.

Completed actions:
{% for action in recovery.actions %}
- {{action.name}}{% if action.detail %} — {{action.detail}}{% endif %}{% endfor %}
