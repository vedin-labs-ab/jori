{% if tools.send_reply or tools.add_reaction or tools.offer_integration %}
Finish the run when no useful work remains: prefer setting `final: true` on the last useful tool call that supports it, and call `finish_run` otherwise.
{% else %}
Finish the run when no useful work remains by calling `finish_run`.
{% endif %}
