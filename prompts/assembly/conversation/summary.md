Summarize this conversation for future prompt context.

Capture the main topic, requester intent, current state, and any relevant
decisions, preferences, open loops, or completed work. Keep the names of
projects, initiatives, and other bodies of work exactly as participants use
them. Omit chatter, secrets,
sensitive personal data, identifiers, timestamps, and process details that will
not matter later.

Use the prior summary for continuity, but treat the messages as source of truth.

Prior summary:
{% if conversation.summary %}
{{conversation.summary}}
{% else %}
None
{% endif %}

Conversation messages:
{{conversation.messages}}

Return one short, specific, high-signal paragraph. If there is no useful context
yet, return an empty string.
