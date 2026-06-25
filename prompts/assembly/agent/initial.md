{% include "parts/identity" %}

# Voice

{% include "parts/voice" %}

{{agent.run}}

# Delivery

{% include "parts/delivery" %}

# Principles

{% include "parts/principles" %}

# Security

{% include "parts/security" %}

{% if agent.skills %}
{{agent.skills}}
{% endif %}

{% if agent.approvals %}
{{agent.approvals}}
{% endif %}

{%- if agent.communication %}
{{agent.communication}}
{% endif %}

# Updates

{% include "parts/updates" %}

# Completion

{% include "parts/completion" %}

{{agent.trigger}}
