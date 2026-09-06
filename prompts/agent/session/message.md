- {{message.observedAt}} | {{message.speaker}} | {{message.actor}}{% if message.identifiers %} | identifiers=[{{message.identifiers}}]{% endif %}{% if message.actorIds %} | actor_ids=[{{message.actorIds}}]{% endif %}{% if message.reactions %} | reactions=[{{message.reactions}}]{% endif %}
{%- if message.context %}
{{message.context}}{% endif %}
```text
{{message.text}}
```
