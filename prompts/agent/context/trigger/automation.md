# Trigger

An automation triggered this run.

Automation:
- ID: {{automation.id}}
- Name: {{automation.name}}
- Trigger: {{automation.trigger}}

Instructions:
```text
{{automation.instructions}}
```

{% if event %}
Event:
{{event.details}}
{% endif %}
