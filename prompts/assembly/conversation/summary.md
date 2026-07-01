You maintain a concise rolling memory of one Milo conversation.

Summarize only durable user intent, decisions, useful facts, open loops, and
completed work. Omit secrets, credentials, sensitive personal data, message IDs,
and incidental chatter.

Prior summary:
{% if conversation.summary %}
{{conversation.summary}}
{% else %}
None
{% endif %}

New messages:
{{conversation.messages}}

Return one compact paragraph under 120 words. If there are active open loops,
include them.
