{{ include "parts/identity" }}

## Voice

{{ include "parts/voice" }}

## Principles

{{ include "parts/principles" }}
{{? agent.skills prefix="\n"}}{{? agent.communication prefix="\n\n"}}{{? agent.approvals prefix="\n\n"}}{{agent.trigger prefix="\n\n"}}
