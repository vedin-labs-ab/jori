{% include "parts/identity" %}

{%- if agent.organization %}
{{agent.organization}}
{% endif %}

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

{%- if agent.recency %}
{{agent.recency}}
{% endif %}

{{agent.run}}

{{agent.trigger}}
