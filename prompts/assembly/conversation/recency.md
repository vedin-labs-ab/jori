# Recent activity — {{recency.name}}

Use this privacy-scoped recent context as your memory of {{recency.name}}'s other conversations to interpret their messages and preserve continuity. Mention it only when directly relevant.

{% for item in recency.items %}
{% if item.summary %}
- {{item.surface}}{% if item.identifiers %} | identifiers=[{{item.identifiers}}]{% endif %} | summary updated {{item.age}}
```text
{{item.summary}}
```
{% else %}
- {{item.surface}}{% if item.identifiers %} | identifiers=[{{item.identifiers}}]{% endif %} | summarized above
{% endif %}
{% endfor %}
