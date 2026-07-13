Prepare the meetings that merit it. The automation's attached "Meeting prep" artifact is the canonical dossier; use its ID from the trigger context.

## Select

Read my @{{providers.calendar}} for meetings with other attendees {% if options.digest == "on" %}from now through this time tomorrow{% else %}today{% endif %}. Exclude all-day events, focus blocks, participant-free holds, and cancelled events. {% if options.meetings == "external" %}Keep meetings with someone outside my organization.{% elsif options.meetings == "internal" %}Keep consequential internal meetings such as decisions, reviews, and negotiations; exclude routine syncs.{% else %}Keep external meetings and consequential internal meetings; exclude routine syncs.{% endif %} If none qualify, finish quietly.

The requester context identifies me; do not infer my identity. Exclude me when researching attendees.

## Dossiers

The artifact state entry is `dossiers`:

```txt
{
  "schemaVersion": 1,
  "days": {
    "<YYYY-MM-DD>": {
      "<event id>": {
        "title": "...",
        "startsAt": "<UTC ISO>",
        "preparedAt": "<UTC ISO>",
        "attendees": [{ "name": "...", "email": "...", "company": "...", "notes": "..." }],
        "context": "...",
        "prepare": ["..."],
        "threads": [{ "subject": "...", "takeaway": "..." }]
      }
    }
  }
}
```

Use #read_artifact_state and #update_artifact_state. Initialize the state if absent. With merge patches, retain today and the previous seven local dates and remove older day keys.

Research each meeting from attendee/company web sources and recent @{{providers.email}} threads. Surface purpose, relevant history, open questions, commitments, and what to have ready. Prefer facts over filler.

{% if options.digest == "on" %}Start one #start_agent per meeting, up to ten. Give each agent the artifact ID, event facts, date key, and exact dossier shape; it sets `preparedAt` to the current UTC time when done. Tell it to send nothing and only research and merge its dossier. Narrow `tools` to the email read/search and web tools it needs. Keep every returned run ID.

Call #wait_for_agents exactly once with those run IDs and `timeout: { unit: "{{agentWait.unit}}", value: {{agentWait.value}} }`. It resumes when every child is terminal or after the timeout. Then re-read today's dossiers and continue with the results available. Note an omission only when a qualifying meeting still lacks a dossier because its child failed, stopped, or timed out. Do not wait again.

Then create a 24-hour #share_artifact link. The day view fragment is `#d=<YYYY-MM-DD>`. Send a compact digest in meeting order: time, people, and what to have ready.

{{delivery}}
{% endif %}
{% if options.before != "off" %}## Before each meeting

For every qualifying meeting starting more than {{options.before}} minutes from now, create one personal one-time #add_automation at start minus {{options.before}} minutes. Use key `meeting-prep:event:<event id>:<start UTC ISO>`, name `Prep: <title>`, attach this artifact, and grant only calendar/email reads, web research, artifact state/share, and the delivery tool. Use these instructions:

```txt
Prepare the requester for `<title>` at `<local time>` (`<event id>`), using attached artifact `<artifact id>`.

Re-read the event on @{{providers.calendar}}. If cancelled or the requester is no longer attending, finish quietly. If moved later today, create the same keyed automation for the new start and stop. If moved earlier or already started, continue now.

Research attendees other than the requester, their companies, and recent @{{providers.email}} threads. If a dossier exists, refresh it with anything newer than `preparedAt`. Merge the complete dossier into `dossiers.days.<YYYY-MM-DD>.<event id>` with a current UTC `preparedAt`.

Create a 24-hour #share_artifact link and append the fragment `#d=<YYYY-MM-DD>&m=<event id>`.

{{delivery}}
```

{% if options.digest == "off" %}Prepare meetings already within {{options.before}} minutes yourself now using the same steps, rather than scheduling them.{% endif %}
{% endif %}
