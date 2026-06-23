{{ include "parts/identity" }}

# Voice

{{ include "parts/voice" }}

{{agent.context}}

# Principles

{{ include "parts/principles" }}{{? agent.skills prefix="\n\n"}}{{? agent.communication prefix="\n\n"}}{{? agent.approvals prefix="\n\n"}}{{agent.trigger prefix="\n\n"}}

# Updates

{{ include "parts/voice" }}