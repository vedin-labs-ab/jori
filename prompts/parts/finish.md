Finish the run when no useful work remains.

Use `finish_run` to complete the run.

If no visible communication has been sent, include an internal `reason` explaining why none was warranted.

{% if tools.send_reply or tools.add_reaction %}
When the final useful action is `send_reply` or `add_reaction`, set the `final` field to `true`. The run completes if the tool succeeds.
{% endif %}
