{% if message.github.repository %}- Repository: {{message.github.repository}}
{% endif %}{% if message.github.issueNumber %}- Issue number: {{message.github.issueNumber}}
{% endif %}{% if message.github.pullNumber %}- Pull request number: {{message.github.pullNumber}}
{% endif %}{% if message.github.commentId %}- Comment ID: {{message.github.commentId}}
{% endif %}{% if message.github.commentKind %}- Comment kind: {{message.github.commentKind}}
{% endif %}{% if message.github.reviewThreadCommentId %}- Review thread comment ID: {{message.github.reviewThreadCommentId}}
{% endif %}
