# Trigger

A {{message.integration}} message triggered this run.

{% if message.surface == "github" %}
{% include "agent/context/trigger/github" %}
{% endif %}
{% if message.surface == "linear" %}
{% include "agent/context/trigger/linear" %}
{% endif %}

{% if message.conversation %}
Recent messages{% if message.conversationSummary %} {{message.conversationSummary}}{% endif %}:

{{message.conversation}}
{% endif %}

Current message:

{{message.current}}
