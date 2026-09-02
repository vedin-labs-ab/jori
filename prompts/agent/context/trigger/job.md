# Trigger

{% if job.cause == "manual" %}The requester started this job run manually ("run now").{% elsif job.cause == "time" %}This job run fired on its schedule.{% else %}An integration event triggered this job run.{% endif %}

Job:
- ID: {{job.id}}
- Name: {{job.name}}
- Trigger: {{job.trigger}}

{% if event %}
Event:
{{event.details}}
{% endif %}
