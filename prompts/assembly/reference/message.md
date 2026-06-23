# Original Trigger

A {{message.integration}} message started this task. For reference:

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

Original message:
{{message.current}}
