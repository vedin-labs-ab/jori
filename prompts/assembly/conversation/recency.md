# Recent Activity

The requester also has recent Milo context elsewhere. Use it only when it helps
interpret this request; do not mention this block directly unless relevant.

{% for item in recency.items %}
- {{item.summarizedAt}} | {{item.surface}}{% if item.identifiers %} | identifiers=[{{item.identifiers}}]{% endif %} | summary updated {{item.age}}
```text
{{item.summary}}
```
{% endfor %}
