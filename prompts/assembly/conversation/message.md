- {{message.observedAt}} | {{message.speaker}} | {{message.actor}}{% if message.messageIds %} | message_ids=[{{message.messageIds}}]{% endif %}{% if message.actorIds %} | actor_ids=[{{message.actorIds}}]{% endif %}
```text
{{message.text}}
```
