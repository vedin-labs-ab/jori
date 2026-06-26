- {{reaction.observedAt}} | {{reaction.type}} | {{reaction.speaker}} | {{reaction.actor}} | reaction={{reaction.reaction}}{% if reaction.identifiers %} | identifiers=[{{reaction.identifiers}}]{% endif %}{% if reaction.actorIds %} | actor_ids=[{{reaction.actorIds}}]{% endif %}{% if reaction.preview %}
```text
{{reaction.preview}}
```
{% endif %}
