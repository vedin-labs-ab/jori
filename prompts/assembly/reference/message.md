# Original Trigger

A {{message.integration}} message started this task. For reference:

{% if message.surface == "github" %}
{% include "target/github" %}
{% endif %}
{% if message.surface == "linear" %}
{% include "target/linear" %}
{% endif %}

Original message:
{{message.current}}
