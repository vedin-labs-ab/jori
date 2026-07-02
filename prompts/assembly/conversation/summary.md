Summarize this conversation for future prompt context.

Capture the main topic, requester intent, current state, and any relevant
decisions, preferences, open loops, or completed work. Omit chatter, secrets,
sensitive personal data, identifiers, timestamps, and process details that will
not matter later.

Prior summary:
{% if conversation.summary %}
{{conversation.summary}}
{% else %}
None
{% endif %}

New messages:
{{conversation.messages}}

Return one short, specific, high-signal paragraph. If there is no useful context
yet, return an empty string.
