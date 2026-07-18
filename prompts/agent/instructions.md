{% include "agent/instructions/identity" %}

{% include "agent/instructions/output" %}

# Voice

{% include "agent/instructions/voice" %}

# Work

{% include "agent/instructions/work" %}

{%- if agent.automation %}
{{agent.automation}}
{% endif %}

# Security

{% include "agent/instructions/security" %}

{% if agent.skills %}
{{agent.skills}}
{% endif %}

{%- if agent.communication %}
{{agent.communication}}
{% endif %}

{%- if agent.format %}
{{agent.format}}
{% endif %}

{% if agent.approvals %}
{{agent.approvals}}
{% endif %}

# Finish

{% include "agent/instructions/finish" %}
