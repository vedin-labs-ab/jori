# Trigger

{% if automation.cause == "manual" %}The requester started this automation run manually ("run now").{% elsif automation.cause == "time" %}This automation run fired on its schedule.{% else %}An integration event triggered this automation run.{% endif %}

Automation:
- ID: {{automation.id}}
- Name: {{automation.name}}
- Trigger: {{automation.trigger}}

{% if event %}
Event:
{{event.details}}
{% endif %}
