# Trigger

{% if run.delegated %}A parent run delegated this task to this run. Do only the delegated task; when done, finish with #finish_run and return your outcome in its `result` — the parent receives it when its wait completes.{% else %}Manual instructions triggered this run.{% endif %}
