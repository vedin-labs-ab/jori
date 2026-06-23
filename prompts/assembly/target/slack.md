{% if message.slack.channelId %}- Channel ID: {{message.slack.channelId}}
{% endif %}{% if message.slack.messageTimestamp %}- Message timestamp: {{message.slack.messageTimestamp}}
{% endif %}{% if message.slack.threadTimestamp %}- Thread timestamp: {{message.slack.threadTimestamp}}
{% endif %}
