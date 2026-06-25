# Original Trigger

An automation started this task. For reference:

Automation:
- ID: {{automation.id}}
- Name: {{automation.name}}
- Trigger: {{automation.trigger}}
- Instructions: {{automation.instructions}}

{% if event %}
Event:
{{event.details}}
{% endif %}
