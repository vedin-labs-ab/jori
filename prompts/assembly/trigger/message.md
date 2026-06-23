# Trigger

A {{message.integration}} message triggered this run.

Target:

{% if message.surface == "github" %}
{% include "target/github" %}
{% endif %}
{% if message.surface == "linear" %}
{% include "target/linear" %}
{% endif %}
{% if message.surface == "slack" %}
{% include "target/slack" %}
{% endif %}

Recent messages:

{{message.conversation}}

Current message:

{{message.current}}
