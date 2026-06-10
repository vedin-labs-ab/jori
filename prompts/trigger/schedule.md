# Trigger

A schedule triggered this run.
Current UTC time: {{time.utc}}.

Schedule:
- ID: {{schedule.id}}
- Name: {{schedule.name}}
- Description: {{schedule.description}}
- Metadata: {{schedule.metadata}}

Publish to:
{{output.target}}

Run the scheduled work and publish the result to this target. If you cannot
complete it, publish a concise status with the blocker.
