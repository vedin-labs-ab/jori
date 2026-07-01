Finish the run when no useful work remains.

Use `finish_run` to complete the run.

If no visible communication has been sent, include an internal `reason` explaining why none was warranted.

{% if tools.send_reply or tools.add_reaction %}
When the final useful action is `send_reply` or `add_reaction`, set the root `final` field to `true`. If active approvals or integration offers remain, the run waits; otherwise it completes after the tool succeeds.
{% endif %}

{% if tools.offer_integration %}
When a missing integration should be connected, call `offer_integration`. If that offer is the final useful action, set the root `final` field to `true`. The run waits while active approvals or integration offers remain.
{% endif %}
