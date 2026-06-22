New {{message.integration}} message in the active conversation.
Source: {{message.source}}
Authority: {{message.authority}}
{{? message.actor prefix="Actor: " suffix="\n"}}Type: {{message.type}}
{{? message.identifiers prefix="Identifiers: " suffix="\n"}}Mentioned Milo: {{message.mentioned}}
Observed at: {{message.observedAt}}

Message:
```text
{{message.text}}
```
