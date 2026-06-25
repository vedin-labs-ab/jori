- {{message.observedAt}} | {{message.speaker}} | {{message.actor}}{% if message.identifiers %} | identifiers=[{{message.identifiers}}]{% endif %}{% if message.actorIds %} | actor_ids=[{{message.actorIds}}]{% endif %}
```text
{{message.text}}
```
