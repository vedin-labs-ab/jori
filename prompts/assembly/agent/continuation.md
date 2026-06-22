{{ include "parts/identity" }}

## Voice

{{ include "parts/voice" }}

## Principles

{{ include "parts/principles" }}

{{agent.skills}}{{? agent.communication prefix="\n\n"}}{{? agent.approvals prefix="\n\n"}}{{agent.reference prefix="\n\n"}}{{agent.continuation prefix="\n\n"}}
