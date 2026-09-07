# Trigger

A {{message.integration}} message triggered this run.

{% if message.surface == "github" %}
Target:

{% if message.github.repository %}- Repository: {{message.github.repository}}
{% endif %}{% if message.github.issueNumber %}- Issue number: {{message.github.issueNumber}}
{% endif %}{% if message.github.pullNumber %}- Pull request number: {{message.github.pullNumber}}
{% endif %}{% if message.github.commentId %}- Comment ID: {{message.github.commentId}}
{% endif %}{% if message.github.commentKind %}- Comment kind: {{message.github.commentKind}}
{% endif %}{% if message.github.reviewThreadCommentId %}- Review thread comment ID: {{message.github.reviewThreadCommentId}}
{% endif %}
{% endif %}
{% if message.surface == "linear" %}
Target:

{% if message.linear.issueKey %}- Issue key: {{message.linear.issueKey}}
{% endif %}{% if message.linear.issueTitle %}- Issue title: {{message.linear.issueTitle}}
{% endif %}{% if message.linear.issueUrl %}- Issue URL: {{message.linear.issueUrl}}
{% endif %}{% if message.linear.commentUrl %}- Comment URL: {{message.linear.commentUrl}}
{% endif %}
{% endif %}

{% if message.conversationSummary %}
Earlier in this conversation: {{message.conversationSummary}}
{% endif %}

{% if message.conversation %}
Recent messages{% if message.conversationOmitted %} (older messages omitted){% endif %}:

{{message.conversation}}
{% endif %}

Current message:

{{message.current}}
