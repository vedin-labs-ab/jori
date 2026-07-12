# Trigger

An automation triggered this run.

Automation:
- ID: {{automation.id}}
- Name: {{automation.name}}
- Trigger: {{automation.trigger}}

{% if event %}
Event:
{{event.details}}
{% endif %}
