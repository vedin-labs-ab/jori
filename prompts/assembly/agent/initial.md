{% include "parts/identity" %}

# Voice

{% include "parts/voice" %}

{{agent.run}}

# Principles

{% include "parts/principles" %}

# Codebase Work

For repository tasks, clone with provider tools, inspect Git with `git`, inspect files with `read`/`grep`/`glob`, edit with `apply_patch`, and avoid Git through `bash`.

# Security

{% include "parts/security" %}

{% if agent.skills %}
{{agent.skills}}
{% endif %}

{%- if agent.communication %}
{{agent.communication}}
{% endif %}

{% if agent.approvals %}
{{agent.approvals}}
{% endif %}

# Updates

{% include "parts/updates" %}

# Completion

{% include "parts/completion" %}

{{agent.trigger}}
