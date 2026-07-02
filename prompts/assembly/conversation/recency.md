# Recent Activity

Use this privacy-scoped recent context as requester memory to interpret the request and preserve continuity. Mention it only when directly relevant.

{% for item in recency.items %}
- {{item.surface}}{% if item.identifiers %} | identifiers=[{{item.identifiers}}]{% endif %} | summary updated {{item.age}}
```text
{{item.summary}}
```
{% endfor %}
