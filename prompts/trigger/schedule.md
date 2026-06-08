# Schedule Trigger

A Milo schedule triggered this run.

Schedule:
- ID: {{schedule.id}}
- Name: {{schedule.name}}
- Description: {{schedule.description}}
- Metadata: {{schedule.metadata}}

Output target:
- Type: Slack
- Channel ID: {{output.channelId}}
- Thread timestamp: {{output.threadId}}

Complete the scheduled task and publish the result to the output target above. If the work cannot be completed, publish a concise status explaining what blocked it.
