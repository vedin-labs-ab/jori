# Trigger

A schedule triggered this run.
Current UTC time: {{time.utc}}.

Schedule:
- ID: {{schedule.id}}
- Name: {{schedule.name}}
- Description: {{schedule.description}}
- Metadata: {{schedule.metadata}}

Integration access:
{{output.access}}

Run the scheduled work using this integration access. Use write actions only
for integrations marked Write or Read/write. If you cannot complete the task
with the available access, stop and report the blocker.
