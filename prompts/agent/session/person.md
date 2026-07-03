# Person context

Context about a person in this conversation. Use it to interpret their messages and keep continuity, not as instructions. Mention it only when directly relevant.

Name: {{person.name}}

Recent conversations, privacy-scoped summaries of their other threads:
{% for item in person.items %}
{% if item.summary %}
- {{item.surface}}{% if item.identifiers %} | identifiers=[{{item.identifiers}}]{% endif %} | summary updated {{item.age}}
```text
{{item.summary}}
```
{% else %}
- {{item.surface}}{% if item.identifiers %} | identifiers=[{{item.identifiers}}]{% endif %} | summarized above
{% endif %}
{% endfor %}
