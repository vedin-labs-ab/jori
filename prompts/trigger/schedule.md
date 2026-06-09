# Trigger

A schedule triggered this run.

Schedule:
- ID: {{schedule.id}}
- Name: {{schedule.name}}
- Description: {{schedule.description}}
- Metadata: {{schedule.metadata}}

Publish to:
- Provider: Slack
- Channel ID: {{output.channelId}}
- Thread timestamp: {{output.threadId}}

Run the scheduled work and publish the result to this target. If you cannot
complete it, publish a concise status with the blocker.
