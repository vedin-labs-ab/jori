# Run

Run ID: {{run.id}}
{% if run.artifactId %}Artifact ID: {{run.artifactId}}
{% endif %}Run started at: {{time.utc}}.
{% if time.local %}Requester local time: {{time.local}}.
{% endif %}

{% if artifact %}## Attached artifact

`{{artifact.title}}` is attached to this run; #read_artifact_state and #update_artifact_state infer its artifact ID.
{% if artifact.contract %}Its state contract defines these entries — address them by `contractName`; the server validates every write against the entry's schema, which #read_artifact shows in full:
{% for entry in artifact.contract %}
- `{{entry.name}}` ({{entry.scope}}, {{entry.schema}}){% if entry.description %}: {{entry.description}}{% endif %}{% endfor %}
{% endif %}
{% endif %}
{% if surface.active %}
Active surface: `{{surface.label}}`
{% endif %}
