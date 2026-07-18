# Run

Run ID: {{run.id}}
{% if run.artifactId %}Artifact ID: {{run.artifactId}}
{% endif %}Run started at: {{time.utc}}.
{% if time.local %}Requester local time: {{time.local}}.
{% endif %}

{% if artifact %}## Attached artifact

`{{artifact.title}}` is this run's primary artifact; #read_artifact_state and #update_artifact_state default to it when `artifactId` is omitted, and take any other accessible artifact's ID explicitly.
{% if artifact.contract %}Its state contract defines these entries — address them by `contractName`; the server validates every write against the entry's schema, which #read_artifact shows in full:
{% for entry in artifact.contract %}
- `{{entry.name}}` ({{entry.scope}}, {{entry.schema}}){% if entry.description %}: {{entry.description}}{% endif %}{% endfor %}

Create a missing document from its empty shape on first write. Runs of this artifact may overlap: before replacing a whole branch, re-read and pass the returned `version` as `expectedVersion`; use `claim` for any effect that must happen at most once. Keep shared-scope entries free of message bodies, private provider URLs, and unnecessary personal data. Report coverage honestly — never let partial work look complete.
{% endif %}
{% endif %}
{% if surface.active %}
Active surface: `{{surface.label}}`
{% endif %}
