{{ include "parts/identity" }}

# Voice

{{ include "parts/voice" }}

{{agent.run}}

# Principles

{{ include "parts/principles" }}

# Security

{{ include "parts/security" }}{{? agent.skills prefix="\n\n"}}{{? agent.communication prefix="\n\n"}}{{? agent.approvals prefix="\n\n"}}

# Updates

{{ include "parts/updates" }}

# Completion

{{ include "parts/completion" }}{{agent.trigger prefix="\n\n"}}
