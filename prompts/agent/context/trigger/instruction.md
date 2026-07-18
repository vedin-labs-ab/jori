# Trigger

{% if run.delegated %}A parent run delegated this task to this run. Do only the delegated task; when done, finish with #finish_run and return your outcome in its `result` — the parent receives it when its wait completes.{% elsif run.trial %}This run is a one-time trial of the instructions below: do one representative slice of the work directly — create no automations and no child agents — and deliver the result now.{% else %}Manual instructions triggered this run.{% endif %}
