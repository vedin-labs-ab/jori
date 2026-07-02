# Trigger

A {{message.integration}} message triggered this run.

{% if message.surface == "github" %}
{% include "target/github" %}
{% endif %}
{% if message.surface == "linear" %}
{% include "target/linear" %}
{% endif %}

{% if message.conversation %}
Recent messages{% if message.conversationSummary %} {{message.conversationSummary}}{% endif %}:

{{message.conversation}}
{% endif %}

Current message:

{{message.current}}
