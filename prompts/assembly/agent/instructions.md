{% include "parts/identity" %}

# Voice

{% include "parts/voice" %}

# Work

{% include "parts/work" %}

# Security

{% include "parts/security" %}

# Output

{% include "parts/output" %}

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

{% include "parts/finish" %}
